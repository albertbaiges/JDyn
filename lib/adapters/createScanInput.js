const { buildExpression, buildProjectionExpression } = require("../parsers");


function createScanInput(input) {


    const filter = input.FilterExpression && buildExpression(input.FilterExpression)
    const projection = input.ProjectionExpression && buildProjectionExpression(input.ProjectionExpression)

    let ExpressionAttributeValues = Object.assign({ }, filter && filter.values);
    let ExpressionAttributeNames = Object.assign({ },
                                        filter && filter.names,
                                        projection && projection.names
                                    );

    if (!Object.keys(ExpressionAttributeNames).length) {
        ExpressionAttributeNames = undefined;
    }

    if (!Object.keys(ExpressionAttributeValues).length) {
        ExpressionAttributeValues = undefined;
    }

    const dynInput = {
        ...input,
        FilterExpression: filter && filter.expression,
        ProjectionExpression: projection && projection.expression,
        ExpressionAttributeValues,
        ExpressionAttributeNames
    }

    return dynInput;
}



module.exports = createScanInput;