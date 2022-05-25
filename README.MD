
# JDyn

![JDyn](./github/jdyn_dark.png#gh-light-mode-only)
![JDyn](./github/jdyn_light.png#gh-dark-mode-only)

JDyn is a DynamoDB library designed to simplify the database client and allow developers to work directly with JavaScript concepts and objects.

## Documentation
___

JDyn methods allow to work with AWS DynamoDB without having to worry about all details that the requests require.

All methods will expect JavaScript types and will internally convert those
into the representations that Amazon DynamoDB understands, expressions and marshalls.

Those method inputs have the same structure as the native ones, although there are some variations to allow faster development, and therefore there is no need to learn new concepts.

Addiotionally, all DynamoDB responses will be treaten allowing to retrieve the important data in a more convenient way.

Next sections present examples of the different use cases of the native DynamoDB solutions along with their alternative in JDyn and fetures that are expected to come in next versions.

## Method responses and migrations guide

Previous versions of the library did not come with the option to obtain any data apart from the data values, as the metadata for isntance.

Starting from JDyn 0.5 all the information will be accessible, nevertheless the library still prioritizes the data coming from the database which is the most important one and in most use cases the metadata.

In previous versions we retrieved an item as follows

``` javascript
const jdyn = require("../lib/jdyn");

const config = { .... };
jdyn.connect(config)

const table = "Table";
const key = {
    HashKey: "key",
    RangeKey: 2015
}

const item  = await jdyn.get(table, key);
```

This way we could comfortably retrieve and item and store it in any variable we wanted.

But, starting in version 0.5 methods will also include the other data including metadata. For this reason we can no longer collect the item directly.

At this point, we could use the native approach which consist in returning the DynamoDB response object with all the data. But this approach forces us to write more lines of code to retrieve the data, for instance

``` javascript
const jdyn = require("../lib/jdyn");

// Consulting DB and storing entire response
const resultingOut = dbCall(...) // {Item: {"data"}, ...}
const user  = resultingOutput.Item; 

// Or alternatively

const { Item: user } = dbCall(...);
```

Both approaches endup complicating the code because the first one forces us to include one more line of code and to remember if the data will come from Item, Items or Attributes (depending on the call). While the second one apart from including the prop name problem also could force us to know rest syntax to store the other data in a variable.

For this reasons JDyn will use the approach of other libraries and returns instead an array where the first field will contain the main data and where the second one constains the extra data.

This approach comes with the advantage that we are no longer required to remember which resulting prop contains the data and it makes a lot easier the task of storing one or both of them via array destructuring. 

``` javascript
const jdyn = require("../lib/jdyn");

const [ user ] = await jdyn.get(...)

// If we want to store everything

const [ user, extra ] = await jdyn.get(...)

```

Therefore, all JDyn methods will now return arrays where the first index contains the resulting data (in some cases if requested on the request) and the second index will contain the rest of information.

Finally, to migrate from a previos version to JDyn 0.5 or greater we will only have to enclose the variables that collect the data from the methods in [ ]

``` javascript
const jdyn = require("../lib/jdyn");

// Working code in version x < 0.5
const user = await jdyn.get(...)


// Code for version 0.5 or greater
const [ user ] = await jdyn.get(...)

```

### Querying tables

To query a table JDyn will expect you to provide the table name and a "dyn" tagged template literal for the key expression, as first and second arguments respectively.

There is an optional third argument, extras, that expects and object with the rest of DynamoDB QueryCommandInput options, where some of them have new more convenient types.

The inputs provided inside the third parameter are the ones that are barely specified since they belong to certain use cases.

Nevertheless, next versions will include the possibility of specifying everything in a single object parameter as it happens with the native solutions.

Parameters:

1. tableName: String
2. keyExpression: dyn tagged template literal
3. extras:
- IndexName
- ProjectionExpression
- FilterExpression
- Limit
- ExclusiveStartKey
- Select
- ScanIndexForward
- ReturnConsumedCapacity
- ConsistentRead


## Examples
___

### Querying tables

#### Native approach

``` javascript
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const config = { .... };
const client = new DynamoDB(config);

const input = {
  TableName:  "Table",
  KeyConditionExpression:  "HashKey = :hkey and RangeKey > :rkey",
  ExpressionAttributeValues: {
    ':hkey': 'key',
    ':rkey': 2015
  }
}

const data = await client.query(input);
const itemsPost2015 = data.Items;

const secondInput = {
  TableName:  "SecondTable",
  KeyConditionExpression:  "HashKey = :hkey and begins_with(#yr, :rkey)",
  ExpressionAttributeValues: {
    ':hkey': 'key',
    ':rkey': 201
  },
  ExpressionAttributeNames: {
    '#yr': 'year'
  }
}

const data = await client.query(input);
const itemsIn201x = data.Items;

```

Querying tables using DynamoDB Document Client does not differ too much from the code in the previous snippet apart fromt the fact that the retrieved items will be unmarshalled.

Unfortunately this approach is very tedious since it requires us to specify the mapping of the values and names in the expressions apart.

#### JDyn approach

``` javascript
const jdyn = require("../lib/jdyn");
const { dyn, begins_with } = require("../lib/jdyn");


const config = { .... };
jdyn.connect(config)

const table = "Table";
const keyExpression = dyn`HashKey = ${"key"} and RangeKey > ${2015}`;

const [ items ] = await client.query(table, keyExpression);


const secondTable = "SecondTable";
const secondKeyExpression = dyn`HashKey = ${"key"} and ${begins_with("year", 201)}`;

const [ itemsIn201x ] = await client.query(secondTable, secondKeyExpression);
```

For more information about the implementation details check the documentation section.

---

### Getting items

#### Native approach

``` javascript
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const config = { .... };
const client = new DynamoDB(config);

const input = {
  TableName:  "Table",
  Key: {
      'HashKey': { 'S': 'key' },
      'RangeKey': { 'N': 2015 }
  }
}

const data = await client.get(input);
const item = data.Item;

const secondInput = {
  TableName:  "SecondTable",
  Key: {
      'HashKey': { 'S': 'key' },
      'RangeKey': { 'N': 2015 }
  },
  ProjectionExpression: "#name, param, obj.sample",
  ExpressionAttributeNames: {
    '#name': 'name'
  }
}

const data = await client.query(input);
const partialItem = data.Item;

```

Using DynamoDB Document Client to get items allows to remove the marshalled values from the Key and returns us an already unmarshalled item.

Nevertheless, we still have to specify the mapping with the expression attribute names that are reserved keywords.

#### JDyn approach


``` javascript
const jdyn = require("../lib/jdyn");


const config = { .... };
jdyn.connect(config)

const table = "Table";
const key = {
    HashKey: "key",
    RangeKey: 2015
}

const [ item ] = await jdyn.get(table, key);

const projection = {
    name: true,
    param: true,
    obj: {
        sample: true
    }
}

// Alternatively
// const projection = ["name", "param", "obj.sample"];

const extra = {
    ProjectionExpression: projection
}

const [ partialItem ] = await jdyn.get(table, key, extra);
```

For more information about the implementation details check the documentation section.

---

### Getting items

#### Native approach

``` javascript
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const config = { .... };
const client = new DynamoDB(config);

const input = {
  TableName:  "Table",
  Key: {
      'HashKey': { 'S': 'key' },
      'RangeKey': { 'N': 2015 }
  }
}

const data = await client.get(input);
const item = data.Item;

const secondInput = {
  TableName:  "SecondTable",
  Key: {
      'HashKey': { 'S': 'key' },
      'RangeKey': { 'N': 2015 }
  },
  ProjectionExpression: "#name, param, obj.sample",
  ExpressionAttributeNames: {
    '#name': 'name'
  }
}

const data = await client.query(input);
const partialItem = data.Item;

```

Using DynamoDB Document Client to get items allows to remove the marshalled values from the Key and returns us an already unmarshalled item.

Nevertheless, we still have to specify the mapping with the expression attribute names that are reserved keywords.

#### JDyn approach


``` javascript
const jdyn = require("../lib/jdyn");


const config = { .... };
jdyn.connect(config)

const table = "Table";
const key = {
    HashKey: "key",
    RangeKey: 2015
}

const [ item ] = await jdyn.get(table, key);

const projection = {
    name: true,
    param: true,
    obj: {
        sample: true
    }
}

// Alternatively
// const projection = ["name", "param", "obj.sample"];

const extra = {
    ProjectionExpression: projection
}

const [ partialItem ] = await jdyn.get(table, key, extra);
```

For more information about the implementation details check the documentation section.  

---

### Putting items

#### Native approach

``` javascript
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const config = { .... };
const client = new DynamoDB(config);

const input = {
  TableName:  "Table",
  Item: {
    HashKey: 'haskey',
    NumAttribute: 1,
    BoolAttribute: true,
    ListAttribute: [1, 'two', false],
    MapAttribute: { foo: 'bar'},
    NullAttribute: null
  }
}

const data = await client.put(input);


const secondInput = {
  TableName:  "Table",
  Item: {
    HashKey: 'haskey',
    NumAttribute: 1,
    BoolAttribute: true,
    ListAttribute: [1, 'two', false],
    MapAttribute: { foo: 'bar'},
    NullAttribute: null
  },
  ReturnValues: "ALL_OLD"
}

const data = await client.put(input);
const previousItem = data.Attributes;

```

Using DynamoDB Document Client to get items allows to remove the marshalled values from the Item and returns us already unmarshalled old attributes.

This case behaves similarly as in JDyn, with the exception that JDyn will expose the old attributes in the response, in case they were requested, in a more convenient way.

#### JDyn approach


``` javascript
const jdyn = require("../lib/jdyn");


const config = { .... };
jdyn.connect(config)

const table = "Table";
const item = {
    HashKey: 'haskey',
    NumAttribute: 1,
    BoolAttribute: true,
    ListAttribute: [1, 'two', false],
    MapAttribute: { foo: 'bar'},
    NullAttribute: null
}

const [ atts /* null */, info ] = await jdyn.put(table, key);

const overwriteItem = {
    HashKey: 'haskey',
    NumAttribute: 1,
    BoolAttribute: true,
    ListAttribute: [1, 'two', false],
    MapAttribute: { foo: 'bar'},
    NullAttribute: null
}

// Alternatively
// const projection = ["name", "param", "obj.sample"];

const extra = {
  ReturnValues: "ALL_OLD"
}

const [ oldAtts, info2 ] = await jdyn.put(table, key, extra);
```

For more information about the implementation details check the documentation section.  

---

### Updating items

This section of the documentation is in progress, expected for May 25th 2022.

---

### Deleting items

#### Native approach

``` javascript
const { DynamoDB } = require("@aws-sdk/client-dynamodb");

const config = { .... };
const client = new DynamoDB(config);

const params = {
  TableName : 'Table',
  Key: {
    HashKey: 'hashkey',
    NumberRangeKey: 1
  }
};

const data = await client.delete(input);


const secondParams = {
  TableName : "Table",
  Key: {
    HashKey: "hashkey",
    NumberRangeKey: 2
  },
  ConditionExpression: "#nm <> :nameValue AND age > :ageValue",
  ExpressionAttributeValues: {
    ":nameValue": "John Doe",
    ":ageValue": 18
  },
    ExpressionAttributeNames: {
      "#nm": "name"
  },
  ReturnValues: "ALL_OLD"
};

const data = await client.delete(input);
const previousItem = data.Attributes;

```

Using DynamoDB Document Client to delete items allow us to remove the marshalled values from the Item and returns us already unmarshalled old attributes. Nevertheless, we will have to keep track and specify the attribute values and attribute names mapping.

#### JDyn approach


``` javascript
const jdyn = require("../lib/jdyn");
const { dyn, toBeDifferentThan } = require("../lib/jdyn");

const config = { .... };
jdyn.connect(config)

const tableName : 'Table';
const key = {
  HashKey: 'hashkey',
  NumberRangeKey: 2
}

const [ atts /* null */, info ] = await jdyn.delete(table, key);

const secondKey = {
  HashKey: 'hashkey',
  NumberRangeKey: 2
}

const extra = {
  ConditionExpression: dyn`${toBeDifferentThan("name", "John Doe")} AND age > ${18}`,
  ReturnValues: "ALL_OLD"
}

const [ oldAtts, info2 ] = await jdyn.delete(table, key, extra);
```

For more information about the implementation details check the documentation section. 

---

## Origin

Developed by Albert Baiges as part of the Bachelor's Final Degree Project, and foundamental part
of the project's Helky API which used an Amazon DynamoDB. Highlight that the version used on the project
could be seen as a pre-release of what the library current is.

## Next steps



## People

Developed by Albert Baiges.
