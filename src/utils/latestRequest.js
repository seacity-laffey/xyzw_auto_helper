export function createLatestRequestController(onLoadingChange) {
  let latestRequestId = 0;
  let activeRequest = null;

  const cancel = () => {
    latestRequestId += 1;
    activeRequest = null;
    onLoadingChange(false);
  };

  const run = (key, task) => {
    if (activeRequest?.key === key) {
      return activeRequest.promise;
    }

    const requestId = ++latestRequestId;
    onLoadingChange(true);

    const promise = Promise.resolve()
      .then(() => task(() => requestId === latestRequestId))
      .finally(() => {
        if (requestId === latestRequestId) {
          onLoadingChange(false);
        }
        if (activeRequest?.requestId === requestId) {
          activeRequest = null;
        }
      });

    activeRequest = { key, promise, requestId };
    return promise;
  };

  return { cancel, run };
}
