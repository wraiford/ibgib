/**
 * Function to produce the minimum permission policy for `AWSDynamoSpace_V1`
 *
 * @returns Permission policy required for `AWSDynamoSpace_V1`
 */
export function getPermissions({
    ddbRegion,
    ddbTableName,
    ddbAccountId,
    ddbTjpGlobalSecondaryIndex,
    s3BucketName,
}) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "VisualEditor0",
                Effect: "Allow",
                Action: [
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:ConditionCheckItem",
                    "dynamodb:PutItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:GetItem",
                    "dynamodb:Query",
                    "dynamodb:UpdateItem",
                    "s3:PutObject",
                    "s3:GetObject"
                ],
                Resource: [
                    `arn:aws:dynamodb:${ddbRegion}:${ddbAccountId}:table/${ddbTableName}`,
                    `arn:aws:dynamodb:${ddbRegion}:${ddbAccountId}:table/${ddbTableName}/index/${ddbTjpGlobalSecondaryIndex}`,
                    `arn:aws:s3:::${s3BucketName}/*`
                ]
            }
        ]
    });
}
