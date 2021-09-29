const t = require('@babel/types');

function getProvide(node) {
    let provideKey = t.identifier(node.key.name);
    let provideValue = t.memberExpression(t.thisExpression(), t.identifier(node.value.property.name));
    return t.objectProperty(provideKey, provideValue);
}

module.exports = {
    getProvide,
};
