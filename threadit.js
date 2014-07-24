
(function AttachThreadit (root, factory) {

	// Setup Threadit appropriately for the environment.

	//Start with AMD.
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	}
	// Next for Node.js or CommonJS.
	else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	}
	// finally, as a browser global.
	else {
		root.Threadit = factory();
	}
}(this, function ThreaditFactory() {

	function Threadit (threadFunction, parameterObj) {

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
		var stringitizedFunk = '\
			onmessage = function (message) { \
				postMessage((' + functionToStringify + ')(message.data)); \
			};';
		return stringitizedFunk;
	}

	return Threadit;

}));





















