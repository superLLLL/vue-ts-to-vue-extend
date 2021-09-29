const { default: generate } = require('@babel/generator');
const t = require('@babel/types');

const propType = {
    TSBooleanKeyword: 'Boolean',
    TSStringKeyword: 'String',
    TSNumberKeyword: 'Number',
    TSObjectKeyword: 'Object',
    TSSymbolKeyword: 'Symbol',
    TSArrayType: 'Array',
    TSAnyKeyword: 'any',
    TSTypeReference: 'any',
    TSTypeLiteral: 'any',
    TSUnionType: 'any',
};
function getProp(node, type) {
    let computed = null;
    const propOptions = node.decorators[0].expression.arguments;
    const toPropsName = propOptions[0]?.value || node.key.name;
    const currentType = node.typeAnnotation.typeAnnotation;
    const toComputedName = node.key.name;
    let typeNode = [t.objectProperty(t.identifier('type'), t.identifier(propType[currentType.type] || 'any'))];
    propOptions.forEach((element) => {
        if (element.type === 'ObjectExpression') {
            element.properties.forEach((item) => {
                if (item.key.name === 'type') {
                    typeNode[0] = item; // 替换type
                } else {
                    typeNode.push(item);
                }
            });
        }
    });

    let props = t.objectProperty(t.identifier(toPropsName), t.objectExpression(typeNode));

    if (type === 'PropSync') {
        // 将propsync放到computed中
        let get = t.objectMethod(
            undefined,
            t.identifier('get'),
            [],
            t.blockStatement([
                t.returnStatement(t.memberExpression(t.thisExpression(), t.identifier(`${toPropsName}`))),
            ])
        );

        let set = t.objectMethod(
            undefined,
            t.identifier('set'),
            [t.identifier('value')],
            t.blockStatement([
                t.expressionStatement(
                    t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('$emit')), [
                        t.stringLiteral(`update:${toPropsName}`),
                        t.identifier('value'),
                    ])
                ),
            ])
        );

        computed = t.objectProperty(t.identifier(toComputedName), t.objectExpression([get, set]));
    }

    return { computed, props };
}

module.exports = {
    getProp,
};
