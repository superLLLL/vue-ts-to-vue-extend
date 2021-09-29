const t = require('@babel/types');

function getEmitNode(nodeArr, node) {
    const copyNode = t.cloneDeep(node);
    const emitName = node.decorators[0].expression.arguments[0]?.value || node.key.name;
    let emitParams = [];

    copyNode.type = 'ObjectMethod';
    delete copyNode.decorators;
    // isBackstatement first parameter
    copyNode.body.body.forEach((item) => {
        if (item.type === 'ReturnStatement') {
            emitParams.push(item.argument);
        }
    });

    // hasParmas  second parameter
    copyNode.params.length && (emitParams = emitParams.concat(copyNode.params));
    let currentEmitNode = [
        t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('$emit')), [
            t.stringLiteral(emitName),
            ...emitParams,
        ]),
    ];

    copyNode.body.body = currentEmitNode.concat(copyNode.body.body);
    nodeArr.push(copyNode);
}

module.exports = {
    getEmitNode,
};
