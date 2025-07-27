let fastifyInstance;

const initializeFastify = async () => {
  if (fastifyInstance) {
    return fastifyInstance;
  }

  const Fastify = require('fastify');
  const FastifyCors = require('@fastify/cors');
  
  // Import route modules - using require since we're in a .js file
  const books = require('../../dist/routes/books').default;
  const anime = require('../../dist/routes/anime').default;
  const manga = require('../../dist/routes/manga').default;
  const comics = require('../../dist/routes/comics').default;
  const lightnovels = require('../../dist/routes/light-novels').default;
  const movies = require('../../dist/routes/movies').default;
  const meta = require('../../dist/routes/meta').default;
  const news = require('../../dist/routes/news').default;

  // Create Fastify instance configured for serverless
  fastifyInstance = Fastify({
    maxParamLength: 1000,
    logger: false, // Disable logging in serverless environment
  });

  // Register CORS
  await fastifyInstance.register(FastifyCors, {
    origin: '*',
    methods: 'GET',
  });

  // Register all route modules
  await fastifyInstance.register(books, { prefix: '/books' });
  await fastifyInstance.register(anime, { prefix: '/anime' });
  await fastifyInstance.register(manga, { prefix: '/manga' });
  await fastifyInstance.register(comics, { prefix: '/comics' });
  await fastifyInstance.register(lightnovels, { prefix: '/light-novels' });
  await fastifyInstance.register(movies, { prefix: '/movies' });
  await fastifyInstance.register(meta, { prefix: '/meta' });
  await fastifyInstance.register(news, { prefix: '/news' });

  // Add home route
  fastifyInstance.get('/', async (request, reply) => {
    return reply.status(200).send('Welcome to Consumet API! 🎉');
  });

  // Add 404 handler
  fastifyInstance.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      message: '',
      error: 'page not found',
    });
  });

  // Ensure Fastify is ready
  await fastifyInstance.ready();
  
  return fastifyInstance;
};

exports.handler = async (event, context) => {
  try {
    const fastify = await initializeFastify();
    
    // Convert Netlify event to Fastify-compatible request
    const request = {
      method: event.httpMethod,
      url: event.path + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
      headers: event.headers || {},
      body: event.body,
    };

    // Create a promise to capture the response
    return new Promise((resolve, reject) => {
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Handle the request using Fastify's inject method for testing/serverless
      fastify.inject({
        method: request.method,
        url: request.url,
        headers: request.headers,
        payload: request.body,
      }).then((result) => {
        resolve({
          statusCode: result.statusCode,
          headers: result.headers,
          body: result.body,
        });
      }).catch((error) => {
        console.error('Fastify inject error:', error);
        reject(error);
      });
    });

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};
