
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const {
    buildProjectionExpression,
    buildUpdateExpressions,
    buildRemovalUpdateExpressions,
    buildIfNotExistsExpressions,
    buildListAppendExpressions,
    treatAsLeafObject
} = require("./parsers");




// Incoming support for more precise options param (ask for metadata)

class JDyn {

    connect(config) {

        if (!config) {
            throw new Error("Configuration required")
        }

        this._config = config;
        this._client = new DynamoDB(this._config);
    }


    async get(tableName, key, projection) {
        const { projectionExpression, expressionAttributeNames } = buildProjectionExpression(projection);

        const marshalledKey = marshall(key);

        const input = {
            TableName: tableName,
            Key: marshalledKey,
            ProjectionExpression: projectionExpression
        }

        if (Object.keys(expressionAttributeNames).length) {
            input["ExpressionAttributeNames"] = expressionAttributeNames;
        }


        console.log(input)

        const response = await this._client.getItem(input);
        const { Item: item } = response;

        // Short-Circuited
        return item && unmarshall(item);
    }


    async put(tableName, item) {
        const marshalledItem = marshall(item);

        const input = {
            TableName: tableName,
            Item: marshalledItem
        }

        const response = await this._client.putItem(input);
        return null;
    }


    async update(tableName, key, item, options) {

        const operation = options.expression || "SET";

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


    async delete(tableName, key, options) {

        const marshalledKey = marshall(key);

        const input = {
            TableName: tableName,
            Key: marshalledKey
        }

        if (options && options.returnValues) {
            if (options.returnValues !== "NONE" && options.returnValues !== "ALL_OLD") {
                throw new Error("Invalid returnValues parameter, expected NONE | ALL_OLD")
            }
            input["ReturnValues"] = options.returnValues;
        }

        const response = await this._client.deleteItem(input);

        const { Attributes: attributes } = response;

        return attributes && unmarshall(attributes);
    }


    async scan(tableName, filter, projection, options) {

        const { projectionExpression, expressionAttributeNames } = buildProjectionExpression(projection);
        const { expressions, attributeNames, attributeValues } = expressionsFromObject(filter);

        let filterExpression = "";
        if (options && !options.exact) {
            filterExpression = expressions.map(expression => {
                const formated = expression.replace("=", ",");
                return `contains(${formated})`;
            }).join(" AND ");
        } else {
            filterExpression = expressions.join(" AND ");
        }

        const input = {
            TableName: tableName,
            ProjectionExpression: projectionExpression,
            FilterExpression: filterExpression
        }


    

        if (Object.keys(attributeValues).length) {
            input["ExpressionAttributeValues"] = marshall(attributeValues);
        }

        if (Object.keys(expressionAttributeNames).length || Object.keys(attributeNames).length) {
            input["ExpressionAttributeNames"] = Object.assign({}, expressionAttributeNames, attributeNames);
        }

        const response = await this._client.scan(input);

        const {Items: items} = response;

        return items && items.map(item => unmarshall(item));

    }


    // Incoming support for batch operations


    // MACROS

    IF_NOT_EXISTS = buildIfNotExistsExpressions;

    LIST_APPEND = buildListAppendExpressions;

    LEAF_MAP = treatAsLeafObject;
}



module.exports = new JDyn();