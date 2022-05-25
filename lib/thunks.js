
const reservedWords = require("./data/reserved_words.json");


function buildComparisonExpression(operator) {
    return (path, value) => (argRef) => {

        const [normalPath, names] = normalizePath(path)
        
        return {
            expression: normalPath + " " + operator + " " + `:${argRef}`,
            values: {
                [`:${argRef}`]: value
            },
            names
        }
    }
}


function normalizePath(path) {

    const names = {};
    const normalizedTokens = [];

    for (let token of path.split(".")) {
        const expKey = !isNaN(token) || (token.toUpperCase() in reservedWords) ? 
            "#n" + token : token;

        if (expKey !== token) {
            names[expKey] = token;
        }

        normalizedTokens.push(expKey);
    }

    const normalizedPath = normalizedTokens.join(".");

    return [normalizedPath, names];
}


const toBeEqual = buildComparisonExpression("=")
const toBeLessThan = buildComparisonExpression("<");
const toBeLessThanOrEqual = buildComparisonExpression("<=");
const toBeGreaterThan = buildComparisonExpression(">")
const toBeGreaterThanOrEqual = buildComparisonExpression(">=")
const toBeDifferentThan = buildComparisonExpression("<>")

const toBeBetween = (from, to) => (prop, argRef) => ({expression: prop + " BETWEEN " + from + " AND " + to})

const contains = (value) => (prop, argRef) => ({expression: "contains(" + prop + "," + value + ")"}) 



function attribute_exists(path) {
    
    return () => {
        const [ parsedPath, names ] = normalizePath(path);
        const expression = `attribute_exists(${parsedPath})`;
        return { expression, names }
        
    }
}


function attribute_not_exists(path) {
    
    return () => {
        const [ parsedPath, names ] = normalizePath(path);
        const expression = `attribute_not_exists(${parsedPath})`;
        return { expression, names }
        
    }
}

module.exports = {
    toBeEqual,
    toBeLessThan,
    toBeLessThanOrEqual,
    toBeGreaterThan,
    toBeGreaterThanOrEqual,
    toBeDifferentThan,
    toBeBetween,
    contains,
    attribute_exists,
    attribute_not_exists
}