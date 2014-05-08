
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

			(function StringifyTheThreadFunction () {
				// convert the function to a string.
				threadFunction = (' ' + threadFunction);

				// reference the name of the parameter.
				var paramName = threadFunction.substring(
					(threadFunction.indexOf('(') + 1),
					threadFunction.indexOf(')')
				);

				// replace occurances of the parameter name.
				threadFunction = threadFunction.split(paramName).join('message.data');


				// trim the function down to it's inner logic.
				var bracketIdx = threadFunction.indexOf('{');
				threadFunction = threadFunction.substring(bracketIdx);

				// utilize the worker scope.
				threadFunction = 'onmessage = function (message) ' + threadFunction;

				// replace the first 'return' with the worker message send function.
				threadFunction = threadFunction.replace('return ', 'postMessage(');
				var colonIdx = threadFunction.indexOf(';', threadFunction.indexOf('postMessage('));
				threadFunction = (
					threadFunction.substring(0,colonIdx)
					+ ')' 
					+ threadFunction.substring(colonIdx)
				);
			})();

			var worker = (function CreateWorker () {

				// Use the Web API to create a Blob file for the worker script.
				var inlineWorkerScript = new Blob(
						[threadFunction],
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

	return Threadit;

}));