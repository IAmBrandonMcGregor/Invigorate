
(function AttachInvigorate (root, factory) {

  // Setup Invigorate appropriately for the environment.

  // Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['threadit'], factory);
  }
  // Next for Node.js or CommonJS.
  else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('threadit'));
  }
  // finally, as a browser global.
  else {
    root.Invigorate = factory(root.Threadit);
  }

})(this, function InvigorateFactory(Threadit) {

  // Invigorate Constructor.
  // -----------------------
  Invigorate = function Invigorate (config) {

    // cache a reference to the current scope.
    var self = this;

    // Apply all configuration parameters to this object.
    for (var param in config) {
      this[param] = config[param];
    }

    // Ensure default configurations are provided where necessary.
    if (!this.numberOfFrames) this.numberOfFrames = 100;
    if (this.autoUpdateCurrentFrame === undefined) this.autoUpdateCurrentFrame = true;
    if (this.autoUpdateSetpieces === undefined) this.autoUpdateSetpieces = true;

    // Initialize the currentFrame value.
    this.currentFrame = 0;

    // Calculate the frame values.
    this.reinvigorate();

    // Attach the 'raze' function with a reference to self.
    this.raze = this.raze.bind(this);

    // Attach scroll listeners if a 'theater' element was provided.
    if (this.theater && this.autoUpdateCurrentFrame) {

      // detect which direction scroll will happen.
      this.scrollAxis = (0 >= this.theater.scrollWidth - this.theater.clientWidth)
        ? 'Y'
        : 'X';

      // debounce the scroll event using the rAF api.
      var debouncing = false;
      this.ScrollDebouncer = function ScrollDebouncer() {
        if (!debouncing) {
          debouncing = true;
          this.rafId = window.requestAnimationFrame(function ProcessScroll() {
            self.updateCurrentFrame.bind(self)();
            if (self.autoUpdateSetpieces)
              self.stylizeElements.bind(self)();
            debouncing = false;
          });
        }
      };
      this.theater.addEventListener('scroll', this.ScrollDebouncer);
    }

    // return the newly created Invigorate object.
    return this;
  };


  // Prototype-Level Functions and Properties.
  // ---------------------------------------------------------------------------
  Invigorate.prototype.transformProperties = ['scale', 'x', 'y', 'rotate'];

  // Function to pre-render & cache styles for each frame.
  Invigorate.prototype.reinvigorate = function reinvigorate () {
    var self = this,
        workers = [];

    // Generate Frames on each set-piece.
    for (var i=0, l=self.setPieces.length; i<l; i++) {
      workers[i] = new Promise(function (resolve, reject) {

        // Calculate all frame values (fill in between keyframes).
        Threadit(CreateFrames, {
          numberOfFrames: self.numberOfFrames,
          keyframes: self.setPieces[i].keyframes,
          setPieceIdx: i,
          transformProperties: self.transformProperties
        })

        // Attach the css-style frames to the setpieces.
        .then(function (framesObj) {
          // set the DOM scope frames using the values calculated via Threadit.
          self.setPieces[framesObj.setPieceIdx].frames = framesObj.frames;

          // this function is finished, so resolve the promise.
          resolve(framesObj.frames);
        },
        function Error(err) {
          console.log("There was an issue creating the frames.");
          console.log(err);
        });

      });
    }

    // Resolve this promise when all of the frames have been created.
    this.promise = Promise.all(workers).then(function () {
      // set the initial styles.
      self.stylizeElements();
      // return the setPieces as the promise handler parameter.
      return self.setPieces;
    });

    return this;
  };

  // Method to calculate the current frame based on scroll position.
  Invigorate.prototype.updateCurrentFrame = function updateCurrentFrame() {

    // Calculate and attach the 'currentFrame' variable.
    if (this.scrollAxis === 'X') {
      this.currentFrame =
        Math.floor(
          ( //percentage scrolled
            this.theater.scrollLeft /
            ( // maximum scroll value.
              this.theater.scrollWidth - this.theater.clientWidth
            )
          )
          *
          this.numberOfFrames
        );
    }
    else {
      this.currentFrame =
        Math.floor(
          ( //percentage scrolled
            this.theater.scrollTop /
            ( // maximum scroll value.
              this.theater.scrollHeight - this.theater.clientHeight
            )
          )
          *
          this.numberOfFrames
        );
    }

    // Dispatch an event.
    this.theater.dispatchEvent(new CustomEvent('frameChanged', {
      'currentFrame': this.currentFrame
    }));

    // Alert developers of the frame via the console.
    this.log('current frame: ' + this.currentFrame);
  };

  // Method to style any elements associated with a set-piece.
  Invigorate.prototype.stylizeElements = function stylizeElements() {
    for (var setPiece, i=0,l=this.setPieces.length; i<l; i++) {
      setPiece = this.setPieces[i];
      if (setPiece.element && setPiece.frames) {
        for (var style in setPiece.frames[this.currentFrame]) {
          if (this.transformProperties.indexOf(style) === -1)
            setPiece.element.style[style] = setPiece.frames[this.currentFrame][style];
        }
      }
    }
  };

  // Method to destroy this instance and remove all event listeners.
  Invigorate.prototype.raze = function () {
    window.cancelAnimationFrame(this.rafId);
    this.theater.removeEventListener('scroll', this.ScrollDebouncer);
    delete this.setPieces;
    this.log("Razed to the ground.");
  };

  // Method to log info only if in dev-mode.
  Invigorate.prototype.log = function (message) {
    if (this.devMode)
      console.log('InvigorateJS - ' + message);
  };


  // Private Functions (will be worker-itized via Threadit.js).
  // ---------------------------------------------------------------------------
  function CreateFrames (options) {

    // reference the keyframes, create frames, and find animated properties.
    var keyframes = options.keyframes,
        frames = [],
        properties = GetProperties(options.keyframes),
        hasTransformProperties = (function () {
          for (var i=0, l=properties.length; i<l; i++)
            if (options.transformProperties.indexOf(properties[i].name) !== -1) return true;
          return false;
        })(),
        valueFormat;

    // create an base array of frames.
    for (var i=0,l=options.numberOfFrames+1; i<l; i++)
      frames[i] = {};

    // calculate and populate each frame.
    for (var frame, i=0, l=frames.length; i<l; i++) {
      frame = frames[i];

      // attach properties on this keyframe.
      for (var property, pi=0, pl=properties.length; pi<pl; pi++) {
        property = properties[pi];

        // if property is set on this keyframe...
        if (keyframes[i] && keyframes[i][property.name] !== undefined) {

          // set the property to the defined value.
          frame[property.name] = keyframes[i][property.name];

          // transition the frames since the last change.
          if (i !== 0) {
            TransitionFrames(
              frames.slice(property.lastKeyframeIdx, i+1),
              property
            );
          }

          // replace the 'lastKeyframeIdx' tracker.
          property.lastKeyframeIdx = i;
        }
        // ...otherwise carry-over the value from the last frame.
        else {
          frame[property.name] = frames[i-1][property.name];
        }
      }
    }

    // Create a CSS-transform compatible 'transform' property.
    if (hasTransformProperties) {
      var css = {
        scale: 'scale',
        x: 'translateX',
        y: 'translateY',
        rotate: 'rotate'
      };
      // Loop through all of the frames and create a 'transform' value.
      for (var frame, i=0, l=frames.length; i<l; i++) {
        frame = frames[i];
        frame.transform = '';
        for (var transformProperty, j=0, m=options.transformProperties.length; j<m; j++) {
          transformProperty = options.transformProperties[j];
          if (frame[transformProperty] !== undefined)
            frame.transform += (' '+css[transformProperty]+'('+frame[transformProperty]+')');
        }
      }
    }

    return {
      frames: frames,
      setPieceIdx: options.setPieceIdx
    };

    // Private Function Definitions.
    // -----------------------------

    // Gets a list of all properties that are animated on this set piece.
    function GetProperties (keyframes) {
      var foundProperties = [];



      function FindUnitOfMeasure (definedValue) {
        if (typeof definedValue == 'number')
          return 'raw';
        else if (definedValue.indexOf('%') > -1)
          return 'percent';
        else if (definedValue.indexOf('px') > -1)
          return 'pixel';
        else if (definedValue.indexOf('deg') > -1)
          return 'degree';
        else
          return undefined;
      }

      // create an array of property names.
      for (var keyframe in keyframes) {
        keyframe = keyframes[keyframe];
        for (var definedProperty in keyframe) {

          // Check to see if we already know that this property is going to be manipulated...
          var found = false;
          for (var i=0, l=foundProperties.length; i<l; i++) {
            if (foundProperties[i].name === definedProperty) {
              found = true;
              break;
            }
          }
          // ... if not, we need to add it to the array of properties we know will be invigorated.
          if (!found) {
            foundProperties[foundProperties.length] = {
              name: definedProperty,
              unitOfMeasure: FindUnitOfMeasure(keyframe[definedProperty])
            }
          }
        }
      }

      return foundProperties;
    }

    // Gets the incrementer value for smoothing between keyframe values.
    function TransitionFrames (framesToTransition, property, transitionType) {

      // determine start and end values.
      var endValue = framesToTransition[framesToTransition.length-1][property.name],
          startValue = framesToTransition[0][property.name],
          uOfMEnding = 'px';

      // parse out the number if necessary
      if (property.name === 'opacity' || property.name === 'scale')
        uOfMEnding = '';
      else if (property.name === 'rotate')
        uOfMEnding = 'deg';
      else if (property.unitOfMeasure !== 'raw') {
        endValue = parseFloat(endValue);
        startValue = parseFloat(startValue);
        if (property.unitOfMeasure === 'percent')
          uOfMEnding = '%';
        else if (property.unitOfMeasure === 'degree')
          uOfMEnding = 'deg';
      }

      // don't bother looping if the values don't need transitioning.
      if (endValue === startValue) return framesToTransition;

      // linear transition (default).
      if (!transitionType || transitionType === 'linear') {
        var increment = ((endValue - parseFloat(startValue)) / framesToTransition.length)

        for (var i=1,l=framesToTransition.length-1; i<l; i++) {
          framesToTransition[i][property.name] =
              parseFloat(framesToTransition[i][property.name])
            + (increment * i)
            + uOfMEnding;
        }

        // also add the increment to the first and last
        framesToTransition[0][property.name] += uOfMEnding;
        framesToTransition[framesToTransition.length-1][property.name] += uOfMEnding;
      }

      return framesToTransition;
    }
  }

  return Invigorate;
});















// This space is intentionally left blank.









