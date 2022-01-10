
# JDyn

JDyn is a library build on top of AWS SDK For JavaScrpit v3 client-dybamodb 
and util-dynamodb to allow developers to work directly with JavaScript Objects.

All methods will expect JavaScript types and will internally convert those
into the representations that Amazon DynamoDB understands, expressions and marshalls.

Furthermore, all returned values will be automatically unmarshalled by the library
so they can be used directly once retrieved.

## Support

Currently JDyn only support the operation get, put, update, delete and scane which
are equivalent to the client-dynamodb commands GetItem, PutItem, UpdateItem, DeleteItem
and Scan. 

## Examples

Coming soon...

## Origin

Developed by Albert Baiges as part of its Bachelor's Final Degree Project, and foundamental part
of the project's API Helky which used an Amazon DynamoDB. Highlight that the version used on the project
could be seen as a pre-release of what the library current is.

## People

Developed by Albert Baiges.