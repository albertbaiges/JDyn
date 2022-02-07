
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

        let projectionExpression, expressionAttributeNames;
        if (projection) {
            ({ projectionExpression, expressionAttributeNames } = buildProjectionExpression(projection));
        }

        const marshalledKey = marshall(key);

        const input = {
            TableName: tableName,
            Key: marshalledKey,
            ProjectionExpression: projectionExpression
        }

        if (expressionAttributeNames && Object.keys(expressionAttributeNames).length) {
            input["ExpressionAttributeNames"] = expressionAttributeNames;
        }

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

        let projectionExpression, expressionAttributeNames;
        if (projection) {
            ({ projectionExpression, expressionAttributeNames } = buildProjectionExpression(projection));
        }

        let expressions, attributeNames, attributeValues;
        if (filter) {
            ({ expressions, attributeNames, attributeValues } = buildUpdateExpressions(filter));
        }

        let filterExpression;
        if (filter && options && options.exact === false) {
            filterExpression = expressions.map(expression => {
                const formated = expression.replace("=", ",");
                return `contains(${formated})`;
            }).join(" AND ");
        } else if (filter) {
            filterExpression = expressions.join(" AND ");
        }


        let names = Object.assign({}, expressionAttributeNames, attributeNames);

        const input = {
            TableName: tableName,
            ProjectionExpression: projectionExpression,
            FilterExpression: filterExpression || undefined,
            ExpressionAttributeValues: attributeValues && Object.keys(attributeValues).length ? marshall(attributeValues) : undefined,
            ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
            Limit: options && options.limit ? options.limit : undefined
        }

        const response = await this._client.scan(input);

        const { Items: items } = response;

        return items && items.map(item => unmarshall(item));

    }


    // Incoming support for batch operations


    async batchGet(operations) {
        const requestItems = operations.reduce((acum, { table, keys, projection }) => {
            console.log("Las keys son", keys)
            const { projectionExpression, expressionAttributeNames } = buildProjectionExpression(projection);


            acum[table] = {
                Keys: keys.map(key => marshall(key)),
                ProjectionExpression: projectionExpression,
                ExpressionAttributeNames: expressionAttributeNames
            }

            return acum;

        }, {});

        const input = {
            RequestItems: requestItems
        }

        const res = await this._client.batchGetItem(input);

        const { Responses: responses } = res;

        
        const items = {};
        for (let prop in responses) {
            items[prop] = responses[prop].map(field => unmarshall(field));
        }

        return items;
    }


    async batchWrite(request) {
        const requestItems = request.reduce((acum, { table, operations }) => {
            acum[table] = operations.map(operation => {
                const opt = {};
                if (operation.put) {
                    opt.PutRequest = {Item: marshall(operation.put)};
                } else if (operation.delete) {
                    opt.DeleteRequest = { Key: marshall(operation.delete)};
                }
                return opt;
            })
            return acum;

        }, {});

        const input = {
            RequestItems: requestItems
        }

        const res = await this._client.batchWriteItem(input);

        return res;
    }



    // MACROS

    IF_NOT_EXISTS = buildIfNotExistsExpressions;

    LIST_APPEND = buildListAppendExpressions;

    LEAF_MAP = treatAsLeafObject;
}



module.exports = new JDyn();