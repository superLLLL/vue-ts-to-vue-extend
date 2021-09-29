const t = require('@babel/types');

function getInject(injectNode, node) {
    const leftName = node.key.name;
    const options = node.decorators[0].expression.arguments[0];
    let currentInject = null;
    if (options.type === 'ObjectExpression') {
        currentInject = t.objectProperty(t.identifier(leftName), options);
    } else {
        currentInject = t.objectProperty(t.identifier(leftName), t.stringLiteral(options.value));
    }
    injectNode.push(currentInject);
}

module.exports = {
    getInject,
};
