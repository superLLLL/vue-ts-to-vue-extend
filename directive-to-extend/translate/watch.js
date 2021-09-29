const t = require('@babel/types');

function getWatchNode(nodeArr, node) {
    // 获取handler
    let copyNode = t.cloneDeep(node);
    copyNode.key.name = 'handler';
    copyNode.type = 'ObjectMethod';
    delete copyNode.decorators;

    // 获取 watch名字
    let watchName = node.decorators[0].expression.arguments[0].value;
    if (watchName.includes('.')) {
        watchName = `'${watchName}'`;
    }

    // 获取options配置
    const watchOptions = node.decorators[0].expression.arguments;
    let currentOptions = null;
    if (watchOptions.length > 1) {
        for (const key in watchOptions) {
            const element = watchOptions[key];
            if (element.type === 'ObjectExpression') {
                element.properties.push(copyNode);
                currentOptions = t.objectProperty(t.identifier(watchName), element);
            }
        }
    } else {
        copyNode.key.name = watchName;
        currentOptions = copyNode;
    }

    nodeArr.push(currentOptions);
}

module.exports = {
    getWatchNode,
};
