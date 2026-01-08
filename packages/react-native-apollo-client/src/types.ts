export const enum ErrorCode {
    GQL_VARIABLE_RETRIEVAL_ERROR = 'GQL_VARIABLE_RETRIEVAL_ERROR',
    GQL_PAYLOAD_RETRIEVAL_ERROR = 'GQL_PAYLOAD_RETRIEVAL_ERROR',
    GQL_OPERATION_TYPE_ERROR = 'GQL_OPERATION_TYPE_ERROR'
}

export const errorMessages: Record<ErrorCode, string> = {
    [ErrorCode.GQL_VARIABLE_RETRIEVAL_ERROR]:
        'Failed to retrieve GraphQL variables from operation',
    [ErrorCode.GQL_OPERATION_TYPE_ERROR]:
        'Failed to determine GraphQL operation type',
    [ErrorCode.GQL_PAYLOAD_RETRIEVAL_ERROR]:
        'Failed to retrieve GraphQL payload from operation'
};
