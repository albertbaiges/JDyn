const { buildBatchWrite } = require("../parsers");




function createBatchWriteInput(input) {


    const RequestItems = buildBatchWrite(input.RequestItems)
    const dynInput = {
        RequestItems
    }

    return dynInput;
}


module.exports = createBatchWriteInput;