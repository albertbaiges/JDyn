const { buildBatchGet } = require("../parsers");



function createBatchGetInput(input) {


    const RequestItems = buildBatchGet(input.RequestItems)

    const dynInput = {
        ...input,
        RequestItems
    }

    return dynInput
}


module.exports = createBatchGetInput;