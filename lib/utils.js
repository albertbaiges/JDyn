


function withKeysInCammelCase(object) {
    const result = Object.keys(object).reduce((acum, key) => {
        const cammelKey = key[0].toLowerCase() + key.slice(1);
        acum[cammelKey] = object[key];
        return acum;
    },{})

    return result;
}


function isObject(value) {
    return value !== null && typeof value === 'object';
}


module.exports = {
    isObject, 
    withKeysInCammelCase
}