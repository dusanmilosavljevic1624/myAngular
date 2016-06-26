/* jshint globalstrict: true */
/* global Scope: false */
'use strict';


describe('Scope', function () {
  it('can be constructed and used as an object', function () {
    var scope = new Scope();
    scope.aProperty = 1;

    expect(scope.aProperty).toBe(1);
  });
});

describe('digest', function () {
  var scope;

  beforeEach(function () {
    scope = new Scope();
  });

  it('calls the listener function of a watch on first $digest', function () {
      var watchFn = function(){ return 'wat'; };
      var listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);

      scope.$digest();

      expect(listenerFn).toHaveBeenCalled();
  });

  it('calls the watch function with the scope as the argument', function () {
    var watchFn = jasmine.createSpy();
    var listenerFn = function() { };
    scope.$watch(watchFn, listenerFn);

    scope.$digest();

    expect(watchFn).toHaveBeenCalledWith(scope);
  });

  it('calls the listener function when the watched value changes', function () {
    scope.someValue = 'a';
    scope.counter = 0;

    scope.$watch(
      function(){ return scope.someValue; },
      function(newValue, oldValue, scope){ scope.counter++; }
    );

    expect(scope.counter).toBe(0);

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.someValue = 'b';
    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('calls listener when initial watch value is undefined', function () {
    scope.counter = 0;

    scope.$watch(
      function(scope){ return scope.someValue },
      function(newValue, oldValue, scope){ scope.counter++ }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('calls listener with new value as old value for the first time', function () {
    scope.someValue = 123;
    var oldValueGiven;

    scope.$watch(
      function(scope){ return scope.someValue; },
      function(newValue, oldValue, scope){ oldValueGiven = oldValue; }
    );

    scope.$digest();

    expect(oldValueGiven).toBe(123);
  });

  it('may have watchers that omit the listener function', function () {
    var watchFn = jasmine.createSpy().and.returnValue('something');
    scope.$watch(watchFn);

    scope.$digest();

    expect(watchFn).toHaveBeenCalled();
  });

  it('triggers chained watchers in the same digest', function () {
    scope.name = 'Dusan';

    scope.$watch(
      function(scope){ return scope.nameUpper; },
      function(newValue, oldValue, scope){
        if (newValue) {
          scope.initial = newValue.substring(0, 1) + '.';
        }
      }
    );

    scope.$watch(
      function(scope){ return scope.name; },
      function(newValue, oldValue, scope){
        if (newValue) {
          scope.nameUpper = newValue.toUpperCase();
        }
      }
    );

    scope.$digest();
    expect(scope.initial).toBe('D.');

    scope.name = 'Andrej';
    scope.$digest();
    expect(scope.initial).toBe('A.');
  });

  it('gives up on the watches after 10 iterations', function () {
    scope.counterA = 0;
    scope.counterB = 0;

    scope.$watch(
      function(scope){ return scope.counterA; },
      function(newValue, oldValue, scope){
        scope.counterB++;
      }
    );

    scope.$watch(
      function(scope){ return scope.counterB; },
      function(newValue, oldValue, scope){
        scope.counterA++;
      }
    );

    expect((function(){ scope.$digest() })).toThrow();
  });

  it('ends the digest when the last watch is clean', function () {
    scope.array = _.range(100);
    var watchExecutions = 0;

    _.times(100, function (i) {
      scope.$watch(
        function(scope){
          watchExecutions++;
          return scope.array[i];
        },
        function(newValue,oldValue, scope){}
      );
    });

    scope.$digest();
    expect(watchExecutions).toBe(200);
    scope.array[0] = 420;
    scope.$digest();
    expect(watchExecutions).toBe(301);
  });

  it('does not end digest in the fashion where the new watches wont be run', function () {

    scope.aValue = 'abc';
    scope.counter = 0;

    scope.$watch(
      function(scope){ return scope.aValue; },
      function(newValue, oldValue,scope){
        scope.$watch(
          function(scope){ return scope.aValue; },
          function(newValue, oldValue, scope){
            scope.counter++;
          }
        );
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

  });

  it('compares based on value if flag is enabled', function () {
    scope.aValue = [1, 2, 3];
    scope.counter = 0;

    scope.$watch(
      function(scope) { return scope.aValue; },
      function(newValue, oldValue, scope){
        scope.counter++;
      },
      true
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.aValue.push(4);
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('should correctly handle NaNs', function () {
    scope.number = 0/0; //NaN
    scope.counter = 0;

    scope.$watch(
      function(scope){ return scope.number; },
      function(newValue, oldValue, scope) {
        scope.counter ++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('executes $eval on a function and returns result', function () {
    scope.aProperty = 42;

    var result = scope.$eval(function(scope){
      return scope.aProperty;
    });

    expect(result).toBe(42);
  });

  it('passes the $eval second argument straight through', function () {
    scope.aProperty = 42;

    var result = scope.$eval(function(scope, args) {
      return scope.aProperty + args;
    }, 2);

    expect(result).toBe(44);
  });

  it('executes $apply-ed function and triggers a $digest', function () {
    scope.aValue = 'someValue';
    scope.counter = 0;

    scope.$watch(
      function(scope){
        return scope.aValue;
      },
      function(newValue, oldValue, scope){
        scope.counter++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$apply(function(scope){
      scope.aValue = 'someOtherValue';
    });
    expect(scope.counter).toBe(2);
  });

  it('executes $evalAsyn-ed function later during the same digest cycle', function () {
    scope.aValue = [1, 2, 3];
    scope.asyncEvaluated = false;
    scope.asyncEvaluatedImmediately = false;

    scope.$watch(
      function(scope){ return scope.aValue; },
      function(newValue, oldValue, scope){
        scope.$evalAsync(function(scope){
          scope.asyncEvaluated = true;
        });
        scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
      }
    );

    scope.$digest();
    expect(scope.asyncEvaluated).toBe(true);
    expect(scope.asyncEvaluatedImmediately).toBe(false);
  });

  it('executes $evalAsync-ed functions added by watch functions', function () {
    scope.aValue = [1, 2, 3];
    scope.asyncEvaluated = false;

    scope.$watch(
      function (scope) {
        if(!scope.asyncEvaluated){
          scope.$evalAsync(function (scope) {
            scope.asyncEvaluated = true;
          });
        }
        return scope.aValue;
      },
      function (newValue, oldValue, scope) {}
    );

    scope.$digest();
    expect(scope.asyncEvaluated).toBe(true);
  });

  it('executes $evalAsync-ed functions even when the watcher is not dirty', function () {
    scope.aValue = [1, 2, 3];
    scope.asyncEvaluatedTimes = 0;

    scope.$watch(
      function (scope) {
        if(scope.asyncEvaluatedTimes < 2){
          scope.$evalAsync(function (scope) {
            scope.asyncEvaluatedTimes++;
          });
        }
        return scope.aValue;
      },
      function (newValue, oldValue, scope) {}
    );

    scope.$digest();
    expect(scope.asyncEvaluatedTimes).toBe(2);
  });

  it('eventually halts $evalAsyncs added by watches', function () {
    scope.aValue = [1, 2, 3];

    scope.$watch(
      function (scope) {
        scope.$evalAsync(function (scope) {
          return scope.aValue;
        });
      },
      function (newValue, oldValue, scope) {}
    );

    expect(function(){scope.$digest();}).toThrow();
  });

  it('has a $$phase field whose value is the current digest phase', function () {
    scope.aValue = [1, 2, 3];
    scope.phaseInWatchFunction = undefined;
    scope.phaseInListenerFunction = undefined;
    scope.phaseInApplyFunction = undefined;

    scope.$watch(
      function(scope){
        scope.phaseInWatchFunction = scope.$$phase;
        return scope.aValue;
      },
      function(newValue, oldValue, scope){
        scope.phaseInListenerFunction = scope.$$phase;
      }
    );

    scope.$apply(function (scope) {
      scope.phaseInApplyFunction = scope.$$phase;
    });

    expect(scope.phaseInWatchFunction).toBe('$digest');
    expect(scope.phaseInListenerFunction).toBe('$digest');
    expect(scope.phaseInApplyFunction).toBe('$apply');
  });

  it('schedules a digest cycle in $evalSync', function (done) {
    scope.aValue = 'abc';
    scope.counter = 0;

    scope.$watch(
      function(scope){ return scope.aValue; },
      function(newValue, oldValue, scope){
          scope.counter++;
      }
    );

    scope.$evalAsync(function (scope) {});

    expect(scope.counter).toBe(0);
    setTimeout(function () {
      expect(scope.counter).toBe(1)
      done();
    }, 50);
  });

  it('allows async $apply with $applyAsync', function (done) {
    scope.counter = 0;

    scope.$watch(
      function(scope){ return scope.aValue; },
      function(newValue, oldValue, scope){
        scope.counter++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$applyAsync(function (scope) {
      scope.aValue = 'abc';
    });
    expect(scope.counter).toBe(1);

    setTimeout(function () {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });

  it('never executes $applyAsync-ed function in the same digest cycle', function (done) {
    scope.aValue = [1, 2, 3];
    scope.asyncApplied = false;

    scope.$watch(
      function(scope){ return scope.aValue; },
      function(newValue, oldValue, scope){
        scope.$applyAsync(function (scope) {
          scope.asyncApplied = true;
        });
      }
    );

    scope.$digest();
    expect(scope.asyncApplied).toBe(false);
    setTimeout(function () {
      expect(scope.asyncApplied).toBe(true);
      done();
    }, 50);
  });

  it('coalesces many calls to $applyAsync', function (done) {
    scope.counter = 0;

    scope.$watch(
      function(scope){
        scope.counter++;
        return scope.aValue;
      },
      function(newValue, oldValue, scope){}
    );

    scope.$applyAsync(function (scope) {
      scope.aValue = 'abc';
    });

    scope.$applyAsync(function (scope) {
      scope.aValue = 'def';
    });

    setTimeout(function () {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });

  it('cancels and flushes $applyAsync if digested first', function (done) {
    scope.counter = 0;

    scope.$watch(
      function(scope){
        scope.counter++;
        return scope.aValue;
      },
      function(newValue, oldValue, scope){ }
    );

    scope.$applyAsync(function (scope) {
      scope.aValue = 'abc';
    });

    scope.$applyAsync(function (scope) {
      scope.aValue = 'def';
    });

    scope.$digest();
    expect(scope.counter).toBe(2);
    expect(scope.aValue).toEqual('def');

    setTimeout(function () {
      expect(scope.counter).toBe(2);
      done();
    }, 50);


  });

});
