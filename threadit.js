
(function AttachThreadit (root, factory) {

	// Setup Threadit appropriately for the environment.
	
	//Start with AMD.
	if (typeof define === 'function' && define.amd) {
		define(['exports'], function (exports) {
			root.Threadit = factory(root, exports);
		});
	}
	// Next for Node.js or CommonJS.
	else if (typeof exports !== 'undefined') {
		factory(root, exports);
	}
	// finally, as a browser global.
	else {
		root.Threadit = factory(root, {});
	}
}(this, function ThreaditFactory(root, Threadit) {

	Threadit = function Threadit (threadFunction, parameterObj) {



		var promise = new Promise(function ThreaditPromise (resolve, reject) {

			var worker = (function CreateWorker () {

				// Use the Web API to create a Blob file for the worker script.
				var inlineWorkerScript = new Blob(
						[StringifyFunctionForWorker(threadFunction)],
						{type: 'application/javascript'}),
					blobURL = window.URL.createObjectURL(inlineWorkerScript),
					worker = new Worker(blobURL);

				// Resolve the promise when the worker/thread is finished.
				worker.addEventListener('message', function ResolvePromise (message) {
					resolve(message.data);
					worker.removeEventListener('message', ResolvePromise);
				});

				// Detach the Blob to free up memory.
				worker.addEventListener('message', function DestroyBlob () {
					window.URL.revokeObjectURL(blobURL);
					worker.removeEventListener('message', DestroyBlob);
				});

				return worker;
			})();

			// Begin execution of the thread/worker.
			worker.postMessage(parameterObj);
		});

		return promise;
	};

	// Private Functions
	// -----------------
	function StringifyFunctionForWorker (functionToStringify) {
		// convert the function to a string.
		functionToStringify = (' ' + functionToStringify);

		// reference the name of the parameter.
		var paramName = functionToStringify.substring(
			(functionToStringify.indexOf('(') + 1),
			functionToStringify.indexOf(')')
		);

		// replace occurances of the parameter name.
		functionToStringify = functionToStringify.split(paramName).join('message.data');


		// trim the function down to it's inner logic.
		var bracketIdx = functionToStringify.indexOf('{');
		functionToStringify = functionToStringify.substring(bracketIdx);

		// utilize the worker scope.
		functionToStringify = 'onmessage = function (message) ' + functionToStringify;

		// replace the first 'return' with the worker message send function.
		functionToStringify = functionToStringify.replace('return ', 'postMessage(');
		var colonIdx = functionToStringify.indexOf(';', functionToStringify.indexOf('postMessage('));
		functionToStringify = (
			functionToStringify.substring(0,colonIdx)
			+ ')' 
			+ functionToStringify.substring(colonIdx)
		);

		return functionToStringify;
	}

	return Threadit;

}));