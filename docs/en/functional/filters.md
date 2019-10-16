Эта страница на [Русском](/docs/ru/functional/filters.md)

## Filters on the list view

```
NB: If for the date the value in the filter field and the value in the attribute field have a different format, then the filter will NOT work on this field.
```

The query for the filter is specified by the expression (search query).

It supports the following operations:

* grouping with parentheses,
* Boolean: AND, OR, NOT,
* comparation: =, <, >, <=, >=, <>,
* arithmetic: +, -, *, /,
* string: like,
* over collections: size.


### Query syntax

Use the `> _` button located at the base of the query field for the filter to select an attribute from the drop-down list. Attribute name is wrapped in *"backticks"*  i.e.:

```
`Attribute name` != 2
```

**Combination Options** of the attribute value for a query:

* and - both (or more) values are required,
* or - any of the values are both (or more) values.

Example:

```
`Attribute1` = 1 AND `Attribute2` != 2
```

When forming a request attribute **String values** are wrapped in *double quotes*:

```
`Field name` != "hello"
```

**Accessing attributes by reference**:

```
`Attribute1`.`Attribute by reference from Attribute 1` = "value"
```

**Hints**:

Click on  `?` sign for the filter (located at the end of the query field) and a model window will open with a description of how the filter works and the syntax of the request to it.

A [library](https://nearley.js.org/) is used to parse search expressions.

### Use cases

The filter can be called up by clicking on a similar type of icon located in each column of the table or by clocking the button next to the search bar at the top of the page.

To create a query for a filter, you need to select a value from the drop-down list, or to start entering a value into a string. As soon as the value is selected, press the `Enter` key - the query result will be displayed in the column with the values.