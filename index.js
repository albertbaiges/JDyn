

const DDB = require("@aws-sdk/client-dynamodb");

class JDyn {
    constructor(config) {
        const {DynamoDB: {Converter}} = require("aws-sdk");
        this.Converter = Converter;
        this._config = config;
        if (this._config) {
            this._client = new DDB.DynamoDBClient(this._config);
        }
        
        console.log("inicializada!")
    }

    async _getItem(input) {
        try {
            //console.log("input", input)
            const getItemCommand = new DDB.GetItemCommand(input);
            const response = await this._client.send(getItemCommand);
            // console.log("resouesta", response)
            const item = response.Item;
            return item && this.Converter.unmarshall(item); // Short-Circuit: item unmarshalled if exists or undefined if not
        } catch (err) {
            throw err;
        }
    }

    async getItem(tableName, key, projectionArray) {
        try {
            const keyMarsh = this.Converter.marshall(key);
            let {projectionExpression, expressionAttributeNames} = this._buildProjection(projectionArray);
    
            const input = {
                TableName: tableName,
                Key: keyMarsh,
                ProjectionExpression: projectionExpression,
            }
    
            if (Object.keys(expressionAttributeNames).length !== 0) {
                input.ExpressionAttributeNames = expressionAttributeNames
            }
            //console.log("antes de privado")
            return this._getItem(input);
        } catch (err) {
            throw err;
        }
    }

    async _putItem(input) {
        try {
            const putItemCommand = new DDB.PutItemCommand(input); 
            const response = await this._client.send(putItemCommand);
            return response;
        } catch (err) {
            throw err;
        }
    }

    async putItem(tableName, item) {
        try {
            const itemMarsh = this.Converter.marshall(item);
            const input = {
                TableName: tableName,
                Item: itemMarsh
            };
            const response = await this._putItem(input);
            return response;
        } catch (err) {
            throw err;
        }
    }

    async _updateItem(input) {
        try {
            const updateCommand = new DDB.UpdateItemCommand(input);
            const response = await this._client.send(updateCommand);
            return this.Converter.unmarshall(response.Attributes);
        } catch (err) {
            throw err;
        }
    }

    async updateItem(tableName, key, update, manual) {
        //console.log("clave", key)
        try {
            const keyMarsh = this.Converter.marshall(key);

            let updateExpressionData, updateValues, updateNames;
            if(manual) {
                updateExpressionData = update.updateExpression;
                updateValues = update.updateValues;
                updateNames = update.updateNames;
            } else {
                const result = this._buildInputs(update);
                updateExpressionData = result.expressionArr.join();
                updateNames = result.attributeNames;
                updateValues = result.attributeValues;
            }
        
            const updateValuesMarsh = this.Converter.marshall(updateValues);
        
            //console.log("marshall key", keyMarsh)
            const input = {
                TableName: tableName,
                Key: keyMarsh,
                UpdateExpression: "SET " + updateExpressionData,
                ExpressionAttributeValues: updateValuesMarsh,
                ReturnValues: "UPDATED_NEW"
            }

            console.log("input", input)
        
        
            if(updateNames && Object.keys(updateNames).length !== 0) {
                input.ExpressionAttributeNames = updateNames;
            }
            const response = await this._updateItem(input);
            return response;
        } catch (err) {
            throw err;
        }

    }

    async _deleteItem(input) {
        try {
            const deleteItemCommand = new DDB.DeleteItemCommand(input); 
            const response = await this._client.send(deleteItemCommand);
            return response;
        } catch (err) {
            throw err;
        }
    }

    async deleteteItem(tableName, key) {
        try {
            const keyMarsh = this.Converter.marshall(key);
            const input = {
                TableName: tableName,
                Key: keyMarsh
            }
            const response = await this._deleteItem(input);
            return response;
        } catch (err) {
            throw err;
        }
    }

    async _scan(input) {
        try {
            const scanCommand = new DDB.ScanCommand(input);
            const response = await this._client.send(scanCommand);
            const items = response.Items;
            return items.map(item => this.Converter.unmarshall(item));
        } catch (err) {
            throw err;
        }
    }

    async scan(tableName, projectionArr, filter, wildcard) {

        console.log(tableName, projectionArr, filter, wildcard)
        let {projectionExpression, expressionAttributeNames} = this._buildProjection(projectionArr);
        const { expressionArr, attributeNames, attributeValues } = this._buildInputs(filter);
        
        let filterValuesMarsh = this.Converter.marshall(attributeValues);

        let filterExpression;
        if (wildcard) {
            const wildcardFormat = expressionArr.map(filterExpression => {
                const formated = filterExpression.replace("=", ",");
                return `contains(${formated})`;
            });
            filterExpression = wildcardFormat.join(" AND ");
        } else {
            filterExpression = expressionArr.join(" AND ");
        }

        if(!filterExpression) {
            filterExpression = undefined;
        } 

        if(Object.keys(filterValuesMarsh).length === 0) {
            filterValuesMarsh = undefined;
        }

        const input = {
            TableName: tableName,
            ProjectionExpression: projectionExpression,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: filterValuesMarsh
        }

        console.log("input", input)
    

        if (Object.keys(expressionAttributeNames).length !== 0) {
            input.ExpressionAttributeNames = expressionAttributeNames
        }

        if(Object.keys(attributeNames).length !== 0) {
            if(input.ExpressionAttributeNames) {
                Object.assign(input.ExpressionAttributeNames, attributeNames);
            } else {
                input.ExpressionAttributeNames = attributeNames;
            }
        }


        const data = await this._scan(input);
        return data;
    }


    _buildInputs(attributes) {
        let expressionArr = [];
        const attributeNames = {};
        const attributeValues = {};
        for (const key in attributes) {
            const expKey = (isNaN(key[0])) ? key : "#n" + key;
            if (expKey !== key) {
                // console.log("eran diferentes", expKey, key)
                attributeNames[expKey] = key;
            }
            if (attributes[key].constructor === Object) {
                // console.log("la key tiene un objeto dentro")
                const subObject = this._buildInputs(attributes[key]); //Que le haga lo mismo a ese objeto
                subObject.expressionArr = subObject.expressionArr.map(update => expKey + "." + update + "_" + key);

                const mappedValueEntries = Object.entries(subObject.attributeValues).map(entry => [entry[0] + "_" + key, entry[1]]);
                subObject.attributeValues = Object.fromEntries(mappedValueEntries);
                expressionArr = expressionArr.concat(subObject.expressionArr);
                Object.assign(attributeNames, subObject.attributeNames);
                Object.assign(attributeValues, subObject.attributeValues);
            } else {
                // console.log("la key no contiene un objecto")
                expressionArr.push(`${expKey}=:${key}`);
                attributeValues[`:${key}`] = attributes[key];
            }
        }
        return { expressionArr, attributeNames, attributeValues };
    }

    _buildProjection(projection) {
        let expressionAttributeNames = {};
        let projectionExpression = "";

        for (let i = 0; i < projection.length; i++) {
            const chainProperty = projection[i];
            const properties = chainProperty.split(".");
            for (let j = 0; j < properties.length; j++) {
                const property = properties[j];
                const expKey = (isNaN(property)) ? property : "#n" + property;
                if (expKey !== property) {
                    expressionAttributeNames[expKey] = property;
                }
                if (j === 0) {
                    projectionExpression += expKey
                } else {
                    projectionExpression += "." + expKey
                }
            }
            if (i !== projection.length - 1) {
                projectionExpression += ",";
            }
        }
        return { projectionExpression, expressionAttributeNames };
    }
}

module.exports = JDyn;