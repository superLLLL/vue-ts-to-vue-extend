const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const generate = require('@babel/generator').default;
const prettier = require('prettier'); // 最后的格式化
const utils = require('./translate/utils');
const vuex = require('./translate/vuex');
const provide = require('./translate/provide');
const watch = require('./translate/watch');
const prop = require('./translate/prop');
const inject = require('./translate/inject');
const emit = require('./translate/emit');

const hooks = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'beforeDestroy',
    'destroyed',
    'errorCaptured',
];
const vuexHooks = ['Getter', 'Mutation', 'Action'];
const removeImport = [
    'vuex-class',
    // 'vue-property-decorator',
    'element-ui/types/form',
    'element-ui/types/loading',
    'element-ui/types/upload',
    'element-ui/types/form-item',
];

function getParseFile(text) {
    /**
     * 均保存为ast结构，需要使用getTemplate 或  getFunTemplate 转化
     */
    let methodsNode = [];
    const computedNode = [];
    const propNode = [];
    const watchNode = [];
    const injectNode = [];
    const provideNode = [];
    const dataNode = [];
    const vuexNode = {}; // 完成后会保存在computed 或 methods中
    const hooksNode = []; // 保存不同生命周期钩子，遍历generate(hooksNode[index])来进行获取
    let others = null; // 在Components中的其他：name,compontents,filter
    let textStart = 0; // component开始的位置

    const ast = parser.parse(text, {
        sourceType: 'module',
        plugins: ['decorators-legacy', 'typescript', 'classProperties'],
        tokens: true,
    });
    traverse(ast, {
        // 去除正常类型注释
        TSTypeAnnotation(path) {
            path.remove();
        },
        // 去除 ?
        Identifier(path) {
            if (path.node.optional) {
                path.node.optional = false;
            }
        },
        // 去除 ！
        TSNonNullExpression(path) {
            path.replaceWith(path.node.expression);
        },
        // 去除 as
        TSAsExpression(path) {
            path.replaceWith(path.node.expression);
        },

        ClassMethod(path) {
            const node = path.node;

            // 删除内部所有的类型注释
            traverse(
                node,
                {
                    TSTypeAnnotation(path) {
                        path.remove();
                    },
                    Identifier(path) {
                        if (path.node.optional) {
                            path.node.optional = false;
                        }
                    },
                    TSNonNullExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                    TSAsExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                },
                path
            );

            // 处理 emit
            if (node.decorators && node.decorators[0].expression.callee.name === 'Emit') {
                emit.getEmitNode(methodsNode, node);
                return;
            }

            // 处理 watch
            if (node.decorators && node.decorators[0].expression.callee.name === 'Watch') {
                watch.getWatchNode(watchNode, node);
                return;
            }

            // 处理生命周期钩子
            if (hooks.includes(node.key.name)) {
                utils.getNode(hooksNode, node);
                return;
            }

            // 处理computed
            if (node.kind === 'get') {
                utils.getNode(computedNode, node);
                return;
            }

            // 处理methods
            if (node.kind === 'method' || !(!node.accessibility && node.decorators)) {
                utils.getNode(methodsNode, node);
                return;
            }
        },
        ClassProperty(path) {
            const node = path.node;
            const currentName = node.decorators ? node.decorators[0].expression.callee?.name : '';

            /**
             * props特殊处理，需要类型注释以添加type
             */
            if (currentName === 'Prop' || currentName === 'PropSync') {
                let { computed, props } = prop.getProp(node, currentName);
                props && propNode.push(props);
                computed && computedNode.push(computed);
            }

            // 删除内部所有的类型注释
            traverse(
                node,
                {
                    TSTypeAnnotation(path) {
                        path.remove();
                    },
                    TSNonNullExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                    Identifier(path) {
                        if (path.node.optional) {
                            path.node.optional = false;
                        }
                    },
                    TSAsExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                },
                path
            );
            // vuex
            if (vuexHooks.includes(currentName)) {
                vuex.getVuex(vuexNode, node, currentName);
            }

            // data
            if (node.accessibility === 'private' && !node.decorators) {
                let copyNode = t.cloneDeep(node);
                copyNode.type = 'ObjectProperty';
                dataNode.push(copyNode);
            }
            // provide
            if (currentName === 'Provide') {
                provideNode.push(provide.getProvide(node));
            }

            // inject
            if (currentName === 'Inject') {
                inject.getInject(injectNode, node);
            }
        },

        CallExpression(path) {
            const node = path.node;
            // 删除内部所有的类型注释
            traverse(
                node,
                {
                    TSTypeAnnotation(path) {
                        path.remove();
                    },
                    Identifier(path) {
                        if (path.node.optional) {
                            path.node.optional = false;
                        }
                    },
                    TSNonNullExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                    TSAsExpression(path) {
                        path.replaceWith(path.node.expression);
                    },
                },
                path
            );
            if (node.callee.name === 'Component') {
                const copyNode = t.cloneDeep(node);
                others = copyNode.arguments[0].properties;
            }
        },

        enter(path) {
            const node = path.node;
            if (node.type === 'Identifier' && node.name === 'Component') {
                textStart = node.start;
            }
            // console.log('----------------');
            // console.log(node);
        },
    });

    // 根据位置调整
    const allNode = [];
    let vuexImport = [];
    let { computed, methods } = vuex.setVuex(vuexNode);
    computed.length && computedNode.unshift(computed[0]);
    methods.length && (methodsNode = methodsNode.concat(methods));

    // 添加vuex 的import
    computed.length && vuexImport.push('mapGetters');
    methods.forEach((element) => {
        vuexImport.push(element.argument.callee.name);
    });
    vuexImport.length && (vuexImport = `import { ${vuexImport.join(', ')} } from 'vuex';`);

    if (others) {
        for (const key in others) {
            const element = others[key];
            allNode.push(element);
        }
    }

    injectNode.length && allNode.push(utils.getTemplate(injectNode, 'inject'));
    provideNode.length && allNode.push(utils.getFunTemplate(provideNode, 'provide'));
    propNode.length && allNode.push(utils.getTemplate(propNode, 'props'));
    dataNode.length && allNode.push(utils.getFunTemplate(dataNode, 'data'));
    computedNode.length && allNode.push(utils.getTemplate(computedNode, 'computed'));
    watchNode.length && allNode.push(utils.getTemplate(watchNode, 'watch'));
    hooksNode.forEach((element) => {
        allNode.push(element);
    });
    methodsNode.length && allNode.push(utils.getTemplate(methodsNode, 'methods'));
    let extneds = generate(
        t.exportDefaultDeclaration(
            t.callExpression(t.memberExpression(t.identifier('Vue'), t.identifier('extend')), [
                t.objectExpression(allNode),
            ])
        )
    ).code;

    let topText = text.slice(0, textStart - 1);

    const importAst = parser.parse(topText, {
        sourceType: 'module',
        plugins: ['decorators-legacy', 'typescript', 'classProperties'],
        tokens: true,
    });

    traverse(importAst, {
        // 去除正常类型注释
        TSTypeAnnotation(path) {
            path.remove();
        },
        // 去除ts装饰器import
        ImportDeclaration(path) {
            const node = path.node;
            if (removeImport.includes(node.source.value)) {
                path.remove();
            }
        },
        // 去除 definite
        VariableDeclarator(path) {
            const node = path.node;
            node.definite = false;
        },
        // 去除 interface
        TSInterfaceDeclaration(path) {
            path.remove();
        },
    });
    topText = generate(importAst).code;
    return prettier.format('<script>\n' + vuexImport + topText + extneds + '\n</script>', {
        tabWidth: 4,
        proseWrap: 'always',
        printWidth: 120,
        arrowParens: 'avoid',
        singleQuote: true,
        trailingComma: 'es5',
        parser: 'vue',
    });
}

module.exports = getParseFile;
