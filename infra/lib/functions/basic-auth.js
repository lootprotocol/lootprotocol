// CloudFront Function — ES 5.1 only (no const, no arrow functions, no Buffer/btoa)
// Enforces HTTP Basic Auth on all viewer requests.
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var expected = 'Basic YWRtaW46TWVzaE1lc2guMjE='; // admin:MeshMesh.21

  if (
    headers.authorization &&
    headers.authorization.value === expected
  ) {
    return request;
  }

  return {
    statusCode: 401,
    statusDescription: 'Unauthorized',
    headers: {
      'www-authenticate': { value: 'Basic realm="Site Protection"' },
      'content-type': { value: 'text/plain' },
    },
    body: 'Unauthorized',
  };
}
