# React-Native Monitoring for @apollo/client

## Overview

Monitor your GraphQL resources with Real User Monitoring (RUM) and perform the following:

-   Identify GraphQL queries and mutations
-   Identify GraphQL variables used in queries and mutations

RUM supports GraphQL requests created using [@apollo/client][2].

## Setup

### Prerequisites

Set up the RUM React Native SDK on your mobile React Native application. For more information, see [RUM React Native Monitoring][1].

Add `@apollo/client` to your application following the [official installation documentation][3].

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

For more information on Apollo Client Links, refer to the [official documentation][4].

### Removing GraphQL information

Use a `resourceEventMapper` in your Datadog configuration to remove sensitive data from GraphQL variables:

```javascript
const datadogConfiguration = new DatadogProviderConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true,
    true,
    true
);

datadogConfiguration.resourceEventMapper = event => {
    // Variables are stored in event.context['_dd.graphql.variables'] as a JSON string when present
    if (event.context['_dd.graphql.variables']) {
        const variables = JSON.parse(event.context['_dd.graphql.variables']);
        if (variables.password) {
            variables.password = '***';
        }
        event.context['_dd.graphql.variables'] = JSON.stringify(variables);
    }

    return event;
};
```

[1]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[2]: https://www.apollographql.com/docs/react/
[3]: https://www.apollographql.com/docs/react/get-started
[4]: https://www.apollographql.com/docs/react/api/link/introduction/
