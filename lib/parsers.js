
const reservedWords = require("./data/reserved_words.json");


function mapArrayToProjection(array) {
    const projectionExpressions = [];
    const expressionAttributeNames = {};

    for (const prop of array) {
        const innerProps = prop.split(".");
        const expKeys = [];
        for (const innerProp of innerProps) {
            const expKey = isNaN(innerProp) ?
                !(innerProp.toUpperCase() in reservedWords) ? innerProp
                    : "#n" + innerProp
                : "#n" + innerProp;
            if (expKey !== innerProp) {
                expressionAttributeNames[expKey] = innerProp;
            }
            expKeys.push(expKey);
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
        const expKey = isNaN(innerProp) ?
            !(innerProp.toUpperCase() in reservedWords) ? innerProp
                : "#n" + innerProp
            : "#n" + innerProp;
        if (expKey !== prop) {
            expressionAttributeNames[expKey] = prop;
        }
        if (typeof (object[prop]) === "object") {
            const subObject = mapObjectToProjection(object[prop]);
            const relativeProps = subObject.projectionExpressions.map(subProp => `${prop}.${subProp}`);
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
        console.log("projection", projection)
        data = mapObjectToProjection(projection);
    } else {
        throw new Error("Projection has an unsupported type")
    }

    const projectionExpression = data.projectionExpressions.join(", ");
    return { projectionExpression, expressionAttributeNames: data.expressionAttributeNames };
}


function buildUpdateExpressions(properties) {

    let argCounter = 0;

    const data = (function buildExpression(properties) {
        let expressions = [];
        const attributeNames = {};
        const attributeValues = {};
        for (const prop in properties) {
            const expKey = isNaN(innerProp) ?
                                !(innerProp.toUpperCase() in reservedWords) ? innerProp
                                : "#n" + innerProp
                            : "#n" + innerProp;
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
                    const { expression, values, names } = properties[prop](argNum);
                    expressions.push(`${expKey}=${expression}`);
                    Object.assign(attributeValues, values);
                    Object.assign(attributeNames, names)
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
    return (argRef) => {
        const expression = `:${argRef}`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values }
    }
}



module.exports = {
    buildProjectionExpression,
    buildUpdateExpressions,
    buildRemovalUpdateExpressions,
    buildIfNotExistsExpressions,
    buildListAppendExpressions,
    treatAsLeafObject
}
