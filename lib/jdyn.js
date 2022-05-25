
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");


const {
    createQueryInput,
    createGetInput,
    createPutInput,
    createDeleteInput,
    createScanInput,
    createBatchGetInput,
    createBatchWriteInput
} = require("./adapters")

const {
    buildProjectionExpression,
    buildUpdateExpressions,
    buildRemovalUpdateExpressions,
    buildIfNotExistsExpressions,
    buildListAppendExpressions,
    treatAsLeafObject,
    buildExpression,
    buildUpdateExpression,
    dyn
} = require("./parsers");


const {
    toBeEqual,
    toBeLessThan,
    toBeLessThanOrEqual,
    toBeGreaterThan,
    toBeGreaterThanOrEqual,
    toBeDifferentThan,
} = require("./thunks");

const { begins_with } = require("./conditions");

class JDyn {

    connect(config) {

        if (!config) {
            throw new Error("Configuration required")
        }

        this._config = config;
        this._client = new DynamoDB(this._config);
    }


    async query(TableName, expression, extra = {}) {

        const input = {
            ...extra,
            TableName,
            KeyConditionExpression: expression,
        }

        
        const dynamoInput = createQueryInput(input);
        
        const { Items, ...rest } = await this._client.query(dynamoInput)

        if (extra.Select === "COUNT") {
            return [null, rest];
        }

        const items = Items.map(unmarshall);

        rest.LastEvaluatedKey = rest.LastEvaluatedKey && unmarshall(rest.LastEvaluatedKey);

        return [items, rest];

    }


    async get(TableName, key, extra) {

        const input = {
            ...extra,
            TableName,
            Key: key
        }

        const dynamoInput = createGetInput(input);

        const response = await this._client.getItem(dynamoInput);

        const { Item: item, ...rest } = response;

        const data = item ? unmarshall(item) : null;

        const result = [data, rest];

        return result;
    }


    async put(TableName, item, extra) {

        const input = {
            ...extra,
            TableName,
            Item: item
        }

        const dynamoInput = createPutInput(input);

        const { Attributes, ...rest } = await this._client.putItem(dynamoInput);

        const atts = Attributes ? unmarshall(Attributes) : null; 

        return [atts, rest]
    }

    //! LA PAYLOAD NO COGE BIEN A LOS ARRAYS REVISAR CON LA PAYLOAD DE MMC CUPON
    async update(tableName, key, item, extra) {

        const operation = (options && options.expression) || "SET";

        const marshalledKey = marshall(key);


        let expression;
        let marshalledAttributeValues;
        let attributeNames;

        if (operation === "SET") {
            const data = buildUpdateExpressions(item);
            expression = data.expressions.join(", ");
            marshalledAttributeValues = marshall(data.attributeValues);
            attributeNames = data.attributeNames;
        } else if (operation === "REMOVE") {
            const data = buildRemovalUpdateExpressions(item);
            expression = data.expressions.join(", ");
            attributeNames = data.attributeNames;
        }

        const input = {
            TableName: tableName,
            Key: marshalledKey,
            UpdateExpression: `${operation} ${expression}`,
        }


        if (marshalledAttributeValues) {
            input["ExpressionAttributeValues"] = marshalledAttributeValues
        }

        if (Object.keys(attributeNames).length) {
            input["ExpressionAttributeNames"] = attributeNames
        }

        if (options && options.returnValues) {
            if (options.returnValues !== "NONE" && options.returnValues !== "ALL_OLD"
                && options.returnValues !== "UPDATED_OLD" && options.returnValues !== "ALL_NEW"
                && options.returnValues !== "UPDATED_NEW") {
                throw new Error("Invalid returnValues parameter, expected NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW")
            }
            input["ReturnValues"] = options.returnValues;
        }

        const response = await this._client.updateItem(input);

        const { Attributes: attributes } = response;

        return attributes && unmarshall(attributes);
    }


    async delete(TableName, key, extra) {

        if (extra && extra.ReturnValues) {
            if (extra.ReturnValues !== "NONE" && extra.ReturnValues !== "ALL_OLD") {
                throw new Error("Invalid ReturnValues parameter, expected NONE | ALL_OLD")
            }
        }

        const input = {
            ...extra,
            TableName,
            Key: key
        }

        const dynInput = createDeleteInput(input)

        const response = await this._client.deleteItem(dynInput);

        const { Attributes: attributes, ...rest } = response;

        const atts = attributes ? unmarshall(attributes) : null; 

        return [atts, rest];

    }


    async scan(TableName, filter, extra) {
        
        const input = {
            ...extra,
            TableName,
            FilterExpression: filter
        }


        const dynamoInput = createScanInput(input);

        const response = await this._client.scan(dynamoInput);

        const { Items, ...rest } = response;

        const items =  Items && Items.map(unmarshall);

        rest.LastEvaluatedKey = rest.LastEvaluatedKey && unmarshall(rest.LastEvaluatedKey)

        return [items, rest];

    }


    async batchGet(operations, extra) {

        const input = {
            ...extra,
            RequestItems: operations
        }

        const dynamoInput = createBatchGetInput(input)

        const { Responses: responses, ...rest } = await this._client.batchGetItem(dynamoInput);

        const items = {};
        for (let prop in responses) {
            items[prop] = responses[prop].map(unmarshall);
        }

        return [items, rest];
    }

    async batchWrite(operations, extra) {

        const input = {
            ...extra, 
            RequestItems: operations
        }

        const dynamoInput = createBatchWriteInput(input);

        const res = await this._client.batchWriteItem(dynamoInput);

        return [null, res];
    }



    // MACROS (will get deprecated)

    IF_NOT_EXISTS = buildIfNotExistsExpressions;

    LIST_APPEND = buildListAppendExpressions;

    LEAF_MAP = treatAsLeafObject;

}



module.exports = exports = new JDyn();

exports.dyn = dyn;
exports.toBeEqual = toBeEqual;
exports.toBeLessThan = toBeLessThan;
exports.toBeLessThanOrEqual = toBeLessThanOrEqual;
exports.toBeGreaterThan = toBeGreaterThan;
exports.toBeGreaterThanOrEqual = toBeGreaterThanOrEqual;
exports.toBeDifferentThan = toBeDifferentThan;
exports.begins_with = begins_with;