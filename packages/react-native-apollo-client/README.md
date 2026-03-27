# React-Native Monitoring for @apollo/client

## Overview

Monitor your GraphQL resources with Real User Monitoring (RUM) and perform the following:

-   Identify GraphQL queries and mutations
-   Identify GraphQL variables used in queries and mutations
-   Identify the GraphQL query payload
-   Capture GraphQL errors from the response

RUM supports GraphQL requests created using [@apollo/client][2].

## Setup

### Prerequisites

Set up the RUM React Native SDK on your mobile React Native application. For more information, see [RUM React Native Monitoring][1].

Add `@apollo/client` (v3.0+) and `graphql` (v15.0+) to your application following the [official installation documentation][3].

### Instrument your ApolloClient

#### Migrate to HttpLink

If you initialize your ApolloClient with the `uri` parameter, initialize it with a `HttpLink`:

```javascript
import { ApolloClient, HttpLink } from '@apollo/client';

// before
const apolloClient = new ApolloClient({
    uri: 'https://my.api.com/graphql'
});

// after
const apolloClient = new ApolloClient({
    link: new HttpLink({ uri: 'https://my.api.com/graphql' })
});
```

#### Use the Datadog Apollo Client Link to collect information

Import `DatadogLink` from `@datadog/mobile-react-native-apollo-client` and use it in your ApolloClient initialization:

```javascript
import { ApolloClient, from, HttpLink } from '@apollo/client';
import { DatadogLink } from '@datadog/mobile-react-native-apollo-client';

const apolloClient = new ApolloClient({
    link: from([
        new DatadogLink(),
        new HttpLink({ uri: 'https://my.api.com/graphql' }) // always in last position
    ])
});
```

#### Configuration options

You can pass options to the `DatadogLink` constructor to control what data is collected:

```javascript
new DatadogLink({
    trackVariables: true, // track GraphQL operation variables (default: true)
    trackPayload: false, // track the GraphQL query payload (default: false)
    trackErrors: false // track GraphQL errors from the response (default: false)
});
```

| Option           | Default | Description                                                                                                       |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `trackVariables` | `true`  | Collect the variables passed to GraphQL operations. You can redact sensitive values using a `resourceEventMapper`. |
| `trackPayload`   | `false` | Collect the GraphQL query string (the operation body).                                                            |
| `trackErrors`    | `false` | Collect errors returned in the GraphQL response `errors` array. Only `message`, `code`, `locations`, and `path` fields are collected; all other fields (such as `extensions` details and `stacktrace`) are filtered out. |

For more information on Apollo Client Links, refer to the [official documentation][4].

### Redacting sensitive GraphQL data

Use a `resourceEventMapper` in your Datadog configuration to redact or drop sensitive data from GraphQL attributes. Variables, payload, and errors are all stored as JSON strings in the resource event context.

```typescript
const datadogConfiguration = new DatadogProviderConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    TrackingConsent.GRANTED,
    {
        rumConfiguration: {
            applicationId: '<RUM_APPLICATION_ID>',
            trackResources: true
        }
    }
);

datadogConfiguration.resourceEventMapper = event => {
    const context = event.context as Record<string, string>;

    // Redact sensitive variables
    if (context['_dd.graphql.variables']) {
        const variables = JSON.parse(context['_dd.graphql.variables']);
        if (variables.password) {
            variables.password = '***';
        }
        context['_dd.graphql.variables'] = JSON.stringify(variables);
    }

    // Drop the payload entirely for a specific operation
    if (context['_dd.graphql.operation_name'] === 'TestOperation') {
        delete context['_dd.graphql.payload'];
    }

    // Redact error messages
    if (context['_dd.graphql.errors']) {
        const errors = JSON.parse(context['_dd.graphql.errors']);
        for (const error of errors) {
            error.message = error.message.replace(/email=\S+/g, 'email=***');
        }
        context['_dd.graphql.errors'] = JSON.stringify(errors);
    }

    return event;
};
```

[1]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[2]: https://www.apollographql.com/docs/react/
[3]: https://www.apollographql.com/docs/react/get-started
[4]: https://www.apollographql.com/docs/react/api/link/introduction/
