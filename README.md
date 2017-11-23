# express-serializer

Serialization helper to handle arrays and property filtering for [Express][express] APIs.

[![npm version](https://badge.fury.io/js/express-serializer.svg)](https://badge.fury.io/js/express-serializer)
[![Build Status](https://travis-ci.org/MediaComem/express-serializer.svg?branch=master)](https://travis-ci.org/MediaComem/express-serializer)
[![Coverage Status](https://coveralls.io/repos/github/MediaComem/express-serializer/badge.svg?branch=master)](https://coveralls.io/github/MediaComem/express-serializer?branch=master)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
  - [Arrays](#arrays)
  - [Passing serialization options](#passing-serialization-options)
  - [Filtering](#filtering)
    - [Filtering with options](#filtering-with-options)
    - [Filtering with query parameters](#filtering-with-query-parameters)
    - [Filtering complex objects](#filtering-complex-objects)
    - [Combining filters](#combining-filters)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

Developed at the [Media Engineering Institute](http://mei.heig-vd.ch) ([HEIG-VD](https://heig-vd.ch)).



## Usage

The most basic usage of this module is to call your own serialization functions to serialize objects:

```js
const express = require('express');
const serializer = require('express-serializer');

const router = express.Router();

router.get('/api/user', (req, res) => {

  // Get an object to serialize.
  const user = {
    first_name: 'John',
    last_name: 'Doe',
    birth_date: new Date()
  };

  // Write your own custom serialization function
  // or use your favorite ORM.
  function serializeUser(req, user) {
    return {
      firstName: user.first_name,
      lastName: user.last_name,
      age: new Date().getFullYear() - user.getFullYear()
    };
  }

  // Call the serializer; it always returns a promise
  // (your serialization function can return a promise too).
  serialize(req, user, serializeUser).then(json => {
    res.send(json);
    // HTTP/1.1 200 OK
    // Content-Type: application/json
    //
    // {
    //   "firstName": "John",
    //   "lastName": "Doe",
    //   "age": 42
    // }
  }).catch(next);
});
```

### Arrays

Now for the interesting part. It will automatically serialize each object in an array:

```js
// Get an array of objects to serialize.
const users = [
  {
    first_name: 'John',
    last_name: 'Doe',
    birth_date: new Date()
  },
  {
    first_name: 'Bob',
    last_name: 'Smith',
    birth_date: new Date()
  }
];

// Use the same serialization function as before.
function serializeUser(req, user) {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    age: new Date().getFullYear() - user.getFullYear()
  };
}

// Each object in the array will be serialized with your function.
serialize(req, users, serializeUser).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // [
  //   {
  //     "firstName": "John",
  //     "lastName": "Doe",
  //     "age": 42
  //   },
  //   {
  //     "firstName": "Bob",
  //     "lastName": "Smith",
  //     "age": 24
  //   }
  // ]
});
```

### Passing serialization options

Any additional options passed to the serializer as the fourth argument will also be passed to your serialization function:

```js
function serializeUser(req, user, options) {

  const serialized = {
    name: `${user.first_name} ${user.last_name}`
  };

  // Use options to customize the behavior of your serialization function.
  if (options && options.includeBirthDate) {
    serialized.birthDate = user.birth_date
  }

  return serialized;
}

// Call the serializer with options.
const options = { includeBirthDate: true };
serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "name": "John Doe",
  //   "birthDate": "2000-01-01T00:00:00Z"
  // }
});
```

### Filtering

Properties of serialized objects can be whitelisted or blacklisted with the `only` and `except` options.

#### Filtering with options

`only` and `except` can be passed in the serialization options:

```js
const user = {
  first_name: 'John',
  last_name: 'Doe',
  birth_date: new Date()
};

function serializeUser(req, user) {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    age: new Date().getFullYear() - user.getFullYear()
  };
}

// Pick only the first name:
serialize(req, user, serializeUser, { only: 'firstName' }).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John"
  // }
});

// Pick both the first and last names:
serialize(req, user, serializeUser, { only: [ 'firstName', 'lastName' ] }).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "lastName": "Doe"
  // }
});

// Omit the last name:
serialize(req, user, serializeUser, { except: 'lastName' }).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "age": 42
  // }
});
```

#### Filtering with query parameters

The `only` and `except` query parameters have the same effect if present in the HTTP request:

```js
// Pick only the first name:
//
// GET /api/user?only=firstName HTTP/1.1
// Accept: application/json
serialize(req, user, serializeUser).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John"
  // }
});

// Pick both the first and last names:
//
// GET /api/user?only=firstName&only=lastName HTTP/1.1
// Accept: application/json
serialize(req, user, serializeUser).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "lastName": "Doe"
  // }
});

// Omit the last name:
//
// GET /api/user?except=lastName HTTP/1.1
// Accept: application/json
serialize(req, user, serializeUser).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "age": 42
  // }
});
```

#### Filtering complex objects

You can use a dotted notation in `only` and `except` to filter properties of more complex objects:

```js
const user = {
  first_name: 'John',
  last_name: 'Doe',
  address: {
    city: 'Sunnydale',
    state: 'California'
  }
};

function serializeUser(req, user) {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    address: user.address
  };
}

// Pick only the last name and city:
const options = {
  only: [ 'lastName', 'address.city' ]
};

serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "address": {
  //     "city": "Sunnydale"
  //   }
  // }
});

// Omit the last name and city through query parameters:
//
// GET /api/user?except=lastName&except=address.city HTTP/1.1
// Accept: application/json
serialize(req, user, serializeUser).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "address": {
  //     "state": "California"
  //   }
  // }
});
```

#### Combining filters

Properties which are both in `only` and `except` are not included in the serialized object:

```js
// Pick only the first and last names,
// and omit the last name and city:
const options = {
  only: [ 'firstName', 'lastName' ],
  except: [ 'lastName', 'address.city' ]
};

serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John",
  //   "address": {
  //     "state": "California"
  //   }
  // }
});
```

If `only` and `except` are specified both in the options and in query parameters, they are merged:

```js
// Pick only the first and last names through options,
// and omit the first name through query parameters:
//
// GET /api/user?except=firstName HTTP/1.1
// Accept: application/json
const options = {
  only: [ 'firstName', 'lastName' ]
};

serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "lastName": "Doe"
  // }
});
```

If `except` is present in both the options and in query parameters, the union of all `except` properties is used:

```js
// Omit the first and last names through options, and omit the state through query parameters:
//
// GET /api/user?except=address.state HTTP/1.1
// Accept: application/json
const options = {
  only: [ 'firstName', 'lastName' ]
};

serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "address": {
  //     "city": "Sunnydale"
  //   }
  // }
});
```

If `only` is present in both the options and in query parameters, the intersection of all `only` properties is used:

```js
// Pick the first and last names through options,
// and pick the first name through query parameters:
//
// GET /api/user?only=firstName HTTP/1.1
// Accept: application/json
const options = {
  only: [ 'firstName', 'lastName' ]
};

serialize(req, user, serializeUser, options).then(json => {
  res.send(json);
  // HTTP/1.1 200 OK
  // Content-Type: application/json
  //
  // {
  //   "firstName": "John"
  // }
});
```



[express]: https://expressjs.com
