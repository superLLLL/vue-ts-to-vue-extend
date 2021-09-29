const t = require('@babel/types');

let vuex = {
    Getter: [],
    Mutation: [],
    Action: [],
};
function getVuex(vuexNode, node, currentName) {
    vuex[currentName].push({
        left: node.key.name,
        right: node.decorators[0].expression.arguments[0].value,
    });

    for (const key in vuex) {
        let vuexObj = [];
        vuex[key].forEach((element, index) => {
            if (element.left === element.right) {
                vuexObj.push(t.objectProperty(t.identifier(element.left), t.stringLiteral(element.left)));
            } else {
                vuexObj.push(t.objectProperty(t.identifier(element.left), t.stringLiteral(element.right)));
            }

            if (index === vuex[key].length - 1) {
                let getter = t.spreadElement(
                    t.callExpression(t.identifier(`map${key}s`), [t.objectExpression(vuexObj)])
                );
                vuexNode[`map${key}s`] = getter;
            }
        });
    }
}

function setVuex(vuexNode) {
    let computed = [],
        methods = [];
    for (const key in vuexNode) {
        const element = vuexNode[key];
        if (key === 'mapGetters') {
            computed.push(element);
        } else {
            methods.push(element);
        }
    }
    emptyVuex();

    return {
        computed,
        methods,
    };
}

function emptyVuex() {
    vuex = {
        Getter: [],
        Mutation: [],
        Action: [],
    };
}

module.exports = {
    getVuex,
    setVuex,
    emptyVuex,
};
