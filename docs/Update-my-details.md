# Update my Details API

The DSF team has developed an API that performs the necessary API calls the Civil Registry to get the details from the `Update My Details` service. The API is expected to return a JSON response as expected by the Express Services. Access to the API is controlled by the DSF API Gateway and must be granted by the DSF team. To access the API, please [contact the DSF team](mailto:dsf-admin@dits.dmrid.gov.cy).

## Update my details API request and response

For the Update my details API endpoint, the project sends a request to the API endpoint. The project uses the [CY Connect - OAuth 2.0 (CY Login)](https://dev.azure.com/cyprus-gov-cds/Documentation/_wiki/wikis/Documentation/122/CY-Connect-OAuth-2.0-(CY-Login)) authentication policy, so the user's `<access_token>` is sent in the `Authorization` header.

**Update my Details Request**

- **HTTP Method**:
  - Defined per endpoint in the method property (defaults to GET if not specified).
- **URL**:
  - Resolved from the url property in your config (from the environment variable).
- **Headers**:
  - **Authorization**: `Bearer <access_token>` (form user's cyLogin access token)
  - **client-key**: `<clientKey>` (from config/env)
  - **service-id**: `<serviceId>` (from config/env)
  - **Accept**: text/plain
**Parameters**: The params object in your config is sent as query parameters for GET requests and as the request body for POST requests.

**Example GET Request:**

```http
GET /get-update-my-details HTTP/1.1
Host: localhost:3002
Authorization: Bearer eyJhbGciOi...
client-key: 12345678901234567890123456789000
service-id: 123
Accept: text/plain
```

**Update my Details Response**

The API is expected to return a JSON response with the following structure (see [govcyApiRequest.mjs](src/utils/govcyApiRequest.mjs) for normalization):

**On Success:**
```http
HTTP/1.1 200 OK

{
  "Succeeded": true,
  "ErrorCode": 0,
  "ErrorMessage": null,
  "Data": {
        "fullName": "COSTIS GIANNIS WITH DATA 1",
        "dob": "1992-10-16",
        "dod": null,
        "pin": "0001234567",
        "email": "example@example.com",
        "emailVerified": true,
        "mobile": "0035799123456",
        "mobileVerified": true,
        "addressInfo": [
            {
                "addressVerified": false,
                "addressText": "ΙΩΝΩΝ  12  \n1101 ΛΕΥΚΩΣΙΑ\nΛΕΥΚΩΣΙΑ\nΚΥΠΡΟΣ"
            }
        ]
    }
}
```