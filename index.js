const _ = require('lodash');

module.exports = function serializer(req, data, serializer, options) {
  if (!req || !req.app || typeof(req.get) != 'function') {
    throw new Error('First argument must be an Express Request object');
  }

  if (_.isFunction(serializer.serialize)) {
    serializer = serializer.serialize;
  } else if (!_.isFunction(serializer)) {
    throw new Error('Serializer must be a function or have a "serialize" property that is a function');
  }

  if (!_.isArray(data)) {
    return Promise.resolve(serializer(req, data, options)).then(result => filterData(req, result, options));
  } else {
    return Promise.all(data.map(item => serializer(req, item, options))).then(result => result.map(result => filterData(req, result, options)));
  }
};

function filterData(req, data, options) {

  const exceptFromOptions = toArray(_.get(options, 'except', []));
  const exceptFromRequest = toArray(req.query.except);
  let except = _.union(exceptFromOptions, exceptFromRequest);

  const onlyFromOptions = toArray(_.get(options, 'only', []));
  const onlyFromRequest = toArray(req.query.only);

  let only = onlyFromOptions;
  let onlyEnabled = only.length >= 1;
  if (only.length && onlyFromRequest.length) {
    only = _.intersection(only, onlyFromRequest);
  } else if (onlyFromRequest.length) {
    only = onlyFromRequest;
    onlyEnabled = only.length >= 1;
  }

  if (onlyEnabled) {
    data = _.pick(data, ...only);
  }

  if (except.length) {
    data = _.omit(data, ...except);
  }

  return data;
}

function toArray(value) {
  return _.compact(_.isArray(value) ? value : [ value ]);
};
