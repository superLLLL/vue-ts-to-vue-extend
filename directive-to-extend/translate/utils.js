const t = require('@babel/types');
const generate = require('@babel/generator').default;

function getNode(type, node) {
    let copyNode = t.cloneDeep(node);
    copyNode.accessibility = '';
    copyNode.kind = '';
    copyNode.type = 'ObjectMethod';
    type.push(copyNode);
}

function getTemplate(nodeArr, type) {
    return t.objectProperty(t.identifier(`${type}`), t.objectExpression(nodeArr));

    // return generate(t.objectProperty(t.identifier(`${type}`), t.objectExpression(nodeArr))).code;
}

function getFunTemplate(nodeArr, type) {
    let funInner = t.blockStatement([t.returnStatement(t.objectExpression(nodeArr))]);
    let funBody = t.objectMethod(undefined, t.identifier(`${type}`), [], funInner);

    // return generate(funBody).code;
    return funBody;
}

function getFunTemplate(nodeArr, type) {
    let funInner = t.blockStatement([t.returnStatement(t.objectExpression(nodeArr))]);
    let funBody = t.objectMethod(undefined, t.identifier(`${type}`), [], funInner);

    // return generate(funBody).code;
    return funBody;
}

module.exports = {
    getNode,
    getTemplate,
    getFunTemplate,
};
