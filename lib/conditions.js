
const reservedWords = require("./data/reserved_words.json");


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


function buildIfNotExistsxpression(path, value) {

    const [ parsedPath, names ] = normalizePath(path);

    return (argRef) => {
        const expression = `if_not_exists(${parsedPath}, :${argRef})`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values, names };
    }
}


function buildContainsExpression(path, value) {
    const [ parsedPath, names ] = normalizePath(path);

    return (argRef) => {
        const expression = `contains(${parsedPath}, :${argRef})`;
        const values = {
            [`:${argRef}`]: value
        }
        return { expression, values, names };
    }
}

function buildAttributeExistsExpresssion(path) {
    const [ parsedPath, names ] = normalizePath(path);

    return () => {
        const expression = `attribute_exists(${parsedPath})`;
        return { expression, names }
        
    }
}

function buildAttributeNotExistsExpresssion(path) {
    const [ parsedPath, names ] = normalizePath(path);

    return () => {
        const expression = `attribute_not_exists(${parsedPath})`;
        return { expression, names }
        
    }
}


function begins_with(path, value) {
    return (argRef) => {
        const [ parsedPath, names ] = normalizePath(path);

        const expression = `begins_with(${parsedPath}, :${argRef})`
        const values = {
            [`:${argRef}`]: value
        }

        return { expression, values, names }


    }
}


exports.begins_with = begins_with;


exports.buildIfNotExistsxpression = buildIfNotExistsxpression;
exports.buildContainsExpression = buildContainsExpression;
exports.buildAttributeExistsExpresssion = buildAttributeExistsExpresssion;
exports.buildAttributeNotExistsExpresssion = buildAttributeNotExistsExpresssion;