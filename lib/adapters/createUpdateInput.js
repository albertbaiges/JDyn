const { marshall } = require("@aws-sdk/util-dynamodb");


function createUpdateInput(input) {

    const update = buildNewUpdateExpression(input.UpdateExpression)

    const dynInput = {
        ...input
    }

    return update;
}

module.exports = createUpdateInput;