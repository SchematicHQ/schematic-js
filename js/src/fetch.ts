export const fetchPolyfill = ((
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const url = input instanceof Request ? input.url : input.toString();
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");

    xhr.open(method, url);

    const headers =
      init?.headers ?? (input instanceof Request ? input.headers : {});
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          const parts = line.split(": ");
          const key = parts.shift();
          const value = parts.join(": ");
          if (typeof key === "string" && key.length > 0) {
            responseHeaders.append(key, value);
          }
        });

      const response: Response = {
        status: xhr.status,
        statusText: xhr.statusText,
        ok: xhr.status >= 200 && xhr.status < 300,
        headers: responseHeaders,
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        text: () => Promise.resolve(xhr.responseText),
        arrayBuffer: () => Promise.resolve(xhr.response),
        blob: () => Promise.resolve(new Blob([xhr.response])),
        clone: function () {
          return this;
        },
        body: null,
        bodyUsed: false,
        type: "default",
        url: xhr.responseURL,
        redirected: false,
        formData: () => {
          throw new Error("Not implemented");
        },
      };
      resolve(response);
    };

    xhr.onerror = () => {
      reject(new TypeError("Network request failed"));
    };

    const body = init?.body ?? (input instanceof Request ? input.body : null);
    if (body instanceof ReadableStream) {
      // Handle ReadableStream
      const reader = body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      new Response(stream).arrayBuffer().then((buffer) => xhr.send(buffer));
    } else if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      typeof body === "string" ||
      body instanceof Blob ||
      body instanceof ArrayBuffer
    ) {
      xhr.send(body);
    } else if (body === null || body === undefined) {
      xhr.send();
    } else {
      xhr.send(JSON.stringify(body));
    }
  });
}) as typeof fetch;
