/* istanbul ignore file */
const _ = require('lodash');
const { expect } = require('chai');
const { spy } = require('sinon');

const serializer = require('../index');

describe('express-serializer', () => {

  let data;
  let req;

  beforeEach(() => {
    data = { foo: 'bar' };
    req = mockExpressRequest();
  });

  it('should return a promise', () => {
    const result = serializer(req, data, _.noop);
    expect(result.then).to.be.a('function');
  });

  it('should return the value returned by the serializer function', async () => {
    const result = await serializer(req, data, _.nthArg(1));
    expect(result).to.equal(data);
  });

  it('should pass the request and value to the serializer function', async () => {
    const serializeSpy = spy();
    await serializer(req, data, serializeSpy);
    expect(serializeSpy.args).to.eql([ [ req, data, undefined ] ]);
  });

  it('should pass additional options to the serializer function', async () => {
    const serializeSpy = spy();
    const options = { bar: 'baz' };
    await serializer(req, data, serializeSpy, options);
    expect(serializeSpy.args).to.eql([ [ req, data, options ] ]);
  });

  it('should serialize each object of an array', async () => {

    const data = [
      { foo: 'bar' },
      { bar: 'baz' },
      { baz: 'qux' }
    ];

    const result = await serializer(req, data, _.nthArg(1));
    expect(result).to.eql(data);
    _.times(3, i => expect(result[i]).to.equal(data[i]));
  });

  it('should accept an object with a serialize function', async () => {

    const serializerObject = {
      serialize: _.nthArg(1)
    };

    const result = await serializer(req, data, serializerObject);
    expect(result).to.equal(data);
  });

  it('should throw an error if given an invalid serializer function', () => {
    expect(() => serializer(req, data, 'foo')).to.throw('Serializer must be a function or have a "serialize" property that is a function');
  });

  it('should throw an error if given a first argument that is not an Express Request object', () => {
    expect(() => serializer('foo', data, _.nthArg(1))).to.throw('First argument must be an Express Request object')
  });

  describe('filtering', () => {

    let person;

    beforeEach(() => {
      person = {
        first: 'John',
        last: 'Doe',
        age: 42,
        email: 'jdoe@example.com'
      };
    });

    describe('through options', () => {
      it('should pick one property indicated by the "only" option', async () => {
        const options = { only: 'first' };
        const result = await serializer(req, person, _.nthArg(1), options);
        expect(result).to.eql({ first: 'John' });
      });

      it('should pick multiple properties indicated by the "only" option', async () => {
        const options = { only: [ 'age', 'email' ] };
        const result = await serializer(req, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42, email: 'jdoe@example.com' });
      });

      it('should omit one property indicated by the "except" option', async () => {
        const options = { except: 'age' };
        const result = await serializer(req, person, _.nthArg(1), options);
        expect(result).to.eql({ first: 'John', last: 'Doe', email: 'jdoe@example.com' });
      });

      it('should omit multiple properties indicated by the "except" option', async () => {
        const options = { except: [ 'first', 'last' ] };
        const result = await serializer(req, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42, email: 'jdoe@example.com' });
      });

      it('should omit properties present in both the "only" and "except" options', async () => {
        const options = { only: [ 'first', 'last' ], except: [ 'last', 'age' ] };
        const result = await serializer(req, person, _.nthArg(1), options);
        expect(result).to.eql({ first: 'John' });
      });

      describe('with a complex object', () => {
        beforeEach(() => {
          person.address = {
            city: 'Sunnydale',
            state: 'California'
          };
        });

        it('should pick deep properties', async () => {
          const options = { only: [ 'first', 'address.city' ] };
          const result = await serializer(req, person, _.nthArg(1), options);
          expect(result).to.eql({ first: 'John', address: { city: 'Sunnydale' } });
        });

        it('should omit deep properties', async () => {
          const options = { except: [ 'last', 'address.city' ] };
          const result = await serializer(req, person, _.nthArg(1), options);
          expect(result).to.eql({ first: 'John', age: 42, email: 'jdoe@example.com', address: { state: 'California' } });
        });

        it('should omit deep properties present in both the "only" and "except" options', async () => {
          const options = { only: [ 'first', 'address.city', 'address.state' ], except: [ 'last', 'address.city' ] };
          const result = await serializer(req, person, _.nthArg(1), options);
          expect(result).to.eql({ first: 'John', address: { state: 'California' } });
        });
      });
    });

    describe('through query parameters', () => {
      it('should pick one property indicated by the "only" query parameter', async () => {
        const filteredReq = mockExpressRequest({ only: 'first' });
        const result = await serializer(filteredReq, person, _.nthArg(1));
        expect(result).to.eql({ first: 'John' });
      });

      it('should pick multiple properties indicated by the "only" option', async () => {
        const filteredReq = mockExpressRequest({ only: [ 'age', 'email' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1));
        expect(result).to.eql({ age: 42, email: 'jdoe@example.com' });
      });

      it('should omit one property indicated by the "except" option', async () => {
        const filteredReq = mockExpressRequest({ except: 'age' });
        const result = await serializer(filteredReq, person, _.nthArg(1));
        expect(result).to.eql({ first: 'John', last: 'Doe', email: 'jdoe@example.com' });
      });

      it('should omit multiple properties indicated by the "except" option', async () => {
        const filteredReq = mockExpressRequest({ except: [ 'first', 'last' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1));
        expect(result).to.eql({ age: 42, email: 'jdoe@example.com' });
      });

      it('should omit properties present in both the "only" and "except" options', async () => {
        const filteredReq = mockExpressRequest({ only: [ 'first', 'last' ], except: [ 'last', 'age' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1));
        expect(result).to.eql({ first: 'John' });
      });

      describe('with a complex object', () => {
        beforeEach(() => {
          person.address = {
            city: 'Sunnydale',
            state: 'California'
          };
        });

        it('should pick deep properties', async () => {
          const filteredReq = mockExpressRequest({ only: [ 'first', 'address.city' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1));
          expect(result).to.eql({ first: 'John', address: { city: 'Sunnydale' } });
        });

        it('should omit deep properties', async () => {
          const filteredReq = mockExpressRequest({ except: [ 'last', 'address.city' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1));
          expect(result).to.eql({ first: 'John', age: 42, email: 'jdoe@example.com', address: { state: 'California' } });
        });

        it('should omit deep properties present in both the "only" and "except" options', async () => {
          const filteredReq = mockExpressRequest({ only: [ 'first', 'address.city', 'address.state' ], except: [ 'last', 'address.city' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1));
          expect(result).to.eql({ first: 'John', address: { state: 'California' } });
        });
      });
    });

    describe('through both options and query parameters', () => {
      it('should pick one property indicated by both the "only" option and the "only" query parameter', async () => {
        const options = { only: 'first' };
        const filteredReq = mockExpressRequest({ only: 'first' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ first: 'John' });
      });

      it('should pick common properties among one indicated by the "only" option and multiple by the "only" query parameter', async () => {
        const options = { only: 'last' };
        const filteredReq = mockExpressRequest({ only: [ 'first', 'last' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ last: 'Doe' });
      });

      it('should pick common properties among multiple ones indicated by the "only" option and one by the "only" query parameter', async () => {
        const options = { only: [ 'age', 'email' ] };
        const filteredReq = mockExpressRequest({ only: 'age' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42 });
      });

      it('should pick common properties among multiple ones indicated by the "only" option and the "only" query parameter', async () => {
        const options = { only: [ 'age', 'email' ] };
        const filteredReq = mockExpressRequest({ only: [ 'first', 'last', 'email' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ email: 'jdoe@example.com' });
      });

      it('should not pick any property if both the "only" option and the "only" query parameter indicate a different property', async () => {
        const options = { only: 'first' };
        const filteredReq = mockExpressRequest({ only: 'last' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({});
      });

      it('should not pick any property if both the "only" option and the "only" query parameter indicate different properties', async () => {
        const options = { only: [ 'first', 'last' ] };
        const filteredReq = mockExpressRequest({ only: [ 'age', 'email' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({});
      });

      it('should omit one property indicated by both the "except" option and the "except" query parameter', async () => {
        const options = { except: 'first' };
        const filteredReq = mockExpressRequest({ except: 'first' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ last: 'Doe', age: 42, email: 'jdoe@example.com' });
      });

      it('should omit multiple properties indicated by both the "except" option and the "except" query parameter', async () => {
        const options = { except: [ 'age', 'email' ] };
        const filteredReq = mockExpressRequest({ except: [ 'age', 'email' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ first: 'John', last: 'Doe' });
      });

      it('should omit one property indicated by the "except" option one property indicated by the "except" query parameter', async () => {
        const options = { except: 'first' };
        const filteredReq = mockExpressRequest({ except: 'last' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42, email: 'jdoe@example.com' });
      });

      it('should omit one property indicated by the "except" option and multiple properties indicated by the "except" query parameter', async () => {
        const options = { except: [ 'first', 'last' ] };
        const filteredReq = mockExpressRequest({ except: 'age' });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ email: 'jdoe@example.com' });
      });

      it('should omit multiple properties indicated by the "except" option and one property indicated by the "except" query parameter', async () => {
        const options = { except: 'email' };
        const filteredReq = mockExpressRequest({ except: [ 'first', 'last' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42 });
      });

      it('should omit multiple properties indicated by the "except" option and multiple properties indicated by the "except" query parameter', async () => {
        const options = { except: [ 'first', 'last' ] };
        const filteredReq = mockExpressRequest({ except: [ 'last', 'email' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42 });
      });

      it('should omit a property present in both the "only" option and the "except" query parameter', async () => {
        const options = { only: [ 'first', 'last' ] };
        const filteredReq = mockExpressRequest({ except: [ 'first', 'age' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ last: 'Doe' });
      });

      it('should omit a property present in both the "only" query parameter and the "except" option', async () => {
        const options = { except: [ 'first', 'last' ] };
        const filteredReq = mockExpressRequest({ only: [ 'first', 'age' ] });
        const result = await serializer(filteredReq, person, _.nthArg(1), options);
        expect(result).to.eql({ age: 42 });
      });

      describe('with a complex object', () => {
        beforeEach(() => {
          person.address = {
            city: 'Sunnydale',
            state: 'California'
          };
        });

        it('should pick deep properties', async () => {
          const options = { only: [ 'first', 'last', 'address.city' ] };
          const filteredReq = mockExpressRequest({ only: [ 'last', 'age', 'address.city' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1), options);
          expect(result).to.eql({ last: 'Doe', address: { city: 'Sunnydale' } });
        });

        it('should omit deep properties', async () => {
          const options = { except: [ 'first', 'address.state' ] };
          const filteredReq = mockExpressRequest({ except: [ 'last' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1), options);
          expect(result).to.eql({ age: 42, email: 'jdoe@example.com', address: { city: 'Sunnydale' } });
        });

        it('should omit deep properties present in both the "only" options and "except" query parameters', async () => {
          const options = { only: [ 'first', 'address.city', 'address.state' ] };
          const filteredReq = mockExpressRequest({ except: [ 'last', 'address.city' ] });
          const result = await serializer(filteredReq, person, _.nthArg(1), options);
          expect(result).to.eql({ first: 'John', address: { state: 'California' } });
        });
      });
    });
  });
});

function mockExpressRequest(query) {
  return {
    app: {},
    get: () => undefined,
    query: query || {}
  };
}
