exports.handler = async (event, context) => {
  // Import the handler from the compiled TypeScript
  const { default: handler } = require('../../dist/main');
  
  // Convert Netlify event to Node.js request/response format
  const req = {
    method: event.httpMethod,
    url: event.path + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
    headers: event.headers || {},
    body: event.body,
  };

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        if (headers) {
          Object.assign(this.headers, headers);
        }
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      write(chunk) {
        this.body += chunk;
      },
      end(chunk) {
        if (chunk) {
          this.body += chunk;
        }
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        });
      }
    };

    try {
      handler(req, res);
    } catch (error) {
      reject(error);
    }
  });
};
