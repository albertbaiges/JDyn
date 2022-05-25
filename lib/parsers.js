
const { marshall } = require("@aws-sdk/util-dynamodb");
const reservedWords = require("./data/reserved_words.json");
const { isObject } = require("./utils");


function mapArrayToProjection(array) {
    const projectionExpressions = [];
    const expressionAttributeNames = {};

    for (const prop of array) {
        const innerProps = prop.split(".");
        const expKeys = [];
        for (const innerProp of innerProps) {
            const indexingStart = innerProp.indexOf("[");

            const key = indexingStart !== -1 ? innerProp.substring(0, indexingStart) : innerProp; 

            const expKey = isNaN(key) ?
                !(key.toUpperCase() in reservedWords) ? key
                    : "#n" + key
                : "#n" + key;
            if (expKey !== key) {
                expressionAttributeNames[expKey] = key;
            }

            const exp = expKey + (indexingStart !== -1 ? innerProp.substring(indexingStart) : "");
            expKeys.push(exp);
        }
        const expression = expKeys.join(".");
        projectionExpressions.push(expression);
    }

    return {
        projectionExpressions,
        expressionAttributeNames
    }
}

function mapObjectToProjection(object) {
    let projectionExpressions = [];
    const expressionAttributeNames = {};
    for (const prop in object) {
        const expKey = isNaN(prop) ?
            !(prop.toUpperCase() in reservedWords) ? prop
                : "#n" + prop
            : "#n" + prop;
        if (expKey !== prop) {
            expressionAttributeNames[expKey] = prop;
        }
        if (typeof (object[prop]) === "object") {
            const subObject = mapObjectToProjection(object[prop]);
            const relativeProps = subObject.projectionExpressions.map(subProp => `${expKey}.${subProp}`);
            projectionExpressions = projectionExpressions.concat(relativeProps)
            Object.assign(expressionAttributeNames, subObject.expressionAttributeNames)
        } else {
            if (object[prop]) {
                projectionExpressions.push(expKey);
            }
        }
    }
    return { projectionExpressions, expressionAttributeNames };
}



function buildProjectionExpression(projection) {

    let data;

    if (projection instanceof Array) {
        data = mapArrayToProjection(projection);
    } else if (typeof (projection) === "object") {
        data = mapObjectToProjection(projection);
    } else {
        throw new Error("Projection has an unsupported type")
    }

    const expression = data.projectionExpressions.join(", ");
    return { expression, names: data.expressionAttributeNames };
}

function buildRemovalUpdateExpressions(properties) {
    const data = (function buildExpression(properties) {
        let expressions = [];
        const attributeNames = {};
        for (const prop in properties) {
            const expKey = isNaN(innerProp) ?
                !(innerProp.toUpperCase() in reservedWords) ? innerProp
                    : "#n" + innerProp
                : "#n" + innerProp;
            if (expKey !== prop) {
                attributeNames[expKey] = prop;
            }

            if (typeof (properties[prop]) === "object" && !(properties[prop] instanceof Array)) {
                const subObject = buildExpression(properties[prop]);
                const relativeExpressions = subObject.expressions.map(expression => `${expKey}.${expression}`);
                expressions = expressions.concat(relativeExpressions);
                Object.assign(attributeNames, subObject.attributeNames)
            } else if (properties[prop] instanceof Array) {
                const positions = properties[prop].map(pos => `${expKey}[${pos}]`);
                expressions = expressions.concat(positions);
            } else {
                expressions.push(`${expKey}`);
            }
        }
        return { expressions, attributeNames };
    })(properties);

    return data;
}

function buildIfNotExistsExpressions(path, value) {
    const names = {};
    const parsedPath = path.split(".").map(token => {
        const expKey = isNaN(innerProp) ?
            !(innerProp.toUpperCase() in reservedWords) ? innerProp
                : "#n" + innerProp
            : "#n" + innerProp;
        if (expKey !== token) {
            names[expKey] = token;
        }
        return expKey;
    }).join(".");

    return (argRef) => {
        const expression = `if_not_exists(${parsedPath}, :${argRef})`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values, names };
    }
}


function buildListAppendExpressions(path, value) {
    const names = {};
    const parsedPath = path.split(".").map(token => {
        const expKey = isNaN(innerProp) ?
            !(innerProp.toUpperCase() in reservedWords) ? innerProp
                : "#n" + innerProp
            : "#n" + innerProp;
        if (expKey !== token) {
            names[expKey] = token;
        }
        return expKey;
    }).join(".");


    return (argRef) => {
        const expression = `list_append(${parsedPath}, :${argRef})`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values, names }
    }

}


function treatAsLeafObject(value) {
    return (prop, argRef) => {
        const expression = `${prop} = :${argRef}`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values }
    }
}

function dyn(templateArray, ...fields) {
    function thunk(args) {

        if (!fields.length) {
            return { expression: templateArray[0] }
        }

        if (args.length !== fields.length) {
            throw new Error("Something went really wrong")
        }
        
        const names = {};
        const values = {};

        let pos = 0;
        let expression = ""
        for(let i = 0 ; i < fields.length ; i++) {

            if (typeof fields[i] === "function") {
                const data = fields[i](args[i])
                Object.assign(names, data.names)
                Object.assign(values, data.values)
                expression += templateArray[pos++] + data.expression
            } else {
                values[":" + args[i]] = fields[i]
                expression += templateArray[pos++] + ":" + args[i]

            }
        }
        return { expression, names, values}
    }

    thunk.argCount = fields.length;
    return thunk;
}


function expressionFromThunk(thunk) {

    const argCount = thunk.argCount;

    const arg = "arg";

    const args = Array.from({length: argCount}, (_, i) => arg + i)

    return thunk(args);

}



function buildExpression(expression) {

    const expressionType = typeof expression;

    let dynInputs;

    if (expressionType === "function") {
        dynInputs = expressionFromThunk(expression) 
    } else if (expressionType === "object" && expression !== null) {
        dynInputs = "pending"
    }

    return dynInputs;

}


function buildUpdateExpression(expression) {
    const expressionType = typeof expression;

    let dynInputs;

    if (expressionType === "function") {
        dynInputs = buildExpression(expression) 
    } else if (expressionType === "object" && expression !== null) {
        const data = buildExpressionFromObject(expression);
        dynInputs = {
            expression: data.expressions.join(", "),
            values: data.values,
            names: data.names
        }
    }

    return dynInputs;

}



function buildExpressionFromObject(object, argCounter = 0) {
    let expressions = [];
    const names = {};
    const values = {};

    for (const key in object) {

        const expKey = !isNaN(key) || key.toUpperCase() in reservedWords ?
                        "#" + key : key;

        if (expKey !== key) {
            names[expKey] = key;
        }

        if (isObject(object[key])) {
            const subObjectExpression = buildExpressionFromObject(object[key], argCounter);
            argCounter = subObjectExpression.lastArgCounter;
            const relativeExpressions = subObjectExpression.expressions
                                        .map(expression => `${expKey}.${expression}`)
            expressions = expressions.concat(relativeExpressions);
            Object.assign(names, subObjectExpression.names);
            Object.assign(values, subObjectExpression.values);
        } else if (typeof (object[key]) === "function") {
            const argNum = `arg${argCounter++}`;
            const subObjectExpression = object[key](expKey, argNum);
            expressions.push(subObjectExpression.expression);
            Object.assign(values, subObjectExpression.values);
        } else {
            const argNum = `arg${argCounter++}`;
            expressions.push(`${expKey}=:${argNum}`);
            values[`:${argNum}`] = object[key];
        }
    }

    return {expressions, names, values, lastArgCounter: argCounter}
}

function buildUpdateExpressions(properties) {

    let argCounter = 0;

    const data = (function buildExpression(properties) {
        let expressions = [];
        const attributeNames = {};
        const attributeValues = {};
        for (const prop in properties) {
            const expKey = isNaN(prop) ?
                                !(prop.toUpperCase() in reservedWords) ? prop
                                : "#n" + prop
                            : "#n" + prop;
            if (expKey !== prop) {
                attributeNames[expKey] = prop;
            }

            if (typeof (properties[prop]) === "object") {
                const subObject = buildExpression(properties[prop]);

                const relativeExpressions = subObject.expressions.map(expression => `${expKey}.${expression}`);

                expressions = expressions.concat(relativeExpressions);
                Object.assign(attributeNames, subObject.attributeNames);
                Object.assign(attributeValues, subObject.attributeValues);
            } else {
                const argNum = `arg${argCounter++}`;
                if (typeof (properties[prop]) === "function") {
                    const { expression, values } = properties[prop](expKey, argNum);
                    expressions.push(expression);
                    Object.assign(attributeValues, values);
                } else {
                    expressions.push(`${expKey}=:${argNum}`);
                    attributeValues[`:${argNum}`] = properties[prop];
                }
            }
        }
        return { expressions, attributeNames, attributeValues };
    })(properties);

    return data;
}



function batchGetFromArray(arr) {
    const ops = arr.reduce((acum, request) => {

        const table = request.TableName;
        delete request.TableName;

        const projection = request.ProjectionExpression && buildProjectionExpression(request.ProjectionExpression);

        if (projection && !Object.keys(projection.names).length) {
            projection.names = undefined;
        }

        acum[table] = {
            ...request,
            Keys: request.Keys.map(key => marshall(key)),
            ProjectionExpression: projection && projection.expression,
            ExpressionAttributeNames: projection && projection.names
        }

        return acum;

    }, {});

    return ops;
}


function buildBatchGet(requestItems) {
    let operations;
    
    if (requestItems instanceof Array) {
        operations = batchGetFromArray(requestItems);
    } else if (isObject(requestItems)) {
        const arr = Object.entries(requestItems).map(([key, value]) => ({...value, TableName: key}));
        operations = batchGetFromArray(arr);
    }
    
    return operations;
}



function batchWriteFromArray(arr) {


    const requestItems = arr.reduce((acum, {TableName, puts, deletes}) => {


        const putRequests = puts ? puts.map(p => {
            const input = {
                PutRequest: {
                    Item: marshall(p)
                }
            }

            return input;
        }) : []

        const deleteRequests = deletes ? deletes.map(d => {
            const input = {
                DeleteRequest: {
                    Key: marshall(d)
                }
            }

            return input;
        }) : [] 


        acum[TableName] = [...putRequests, ...deleteRequests];

        return acum;

    }, { });

    return requestItems;
}


function buildBatchWrite(requestItems) {
    let operations;
    
    if (requestItems instanceof Array) {
        operations = batchWriteFromArray(requestItems);
    } else if (isObject(requestItems)) {
        const arr = Object.entries(requestItems).map(([key, value]) => ({...value, TableName: key}));
        operations = batchWriteFromArray(arr);
    }
    
    return operations;
    
}


function buildNewUpdateExpression(param) {
    const expressionType = typeof expression;

    let dynInputs;

    if (expressionType === "function") {
        dynInputs = buildExpression(expression) 
    } else if (expressionType === "object" && expression !== null) {
        dynInputs = newMapper(expression);
    }

    return dynInputs;
}

function newMapper(item) {

    const operation = Object.keys(item)[0];

    

}


module.exports = {
    buildProjectionExpression,
    buildUpdateExpressions,
    buildRemovalUpdateExpressions,
    buildIfNotExistsExpressions,
    buildListAppendExpressions,
    treatAsLeafObject,
    dyn,
    buildExpression,
    buildUpdateExpression,
    buildBatchGet,
    buildBatchWrite
}
