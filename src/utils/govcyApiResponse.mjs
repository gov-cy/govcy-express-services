/**
 * The successResponse function creates a standardized success response object.
 * 
 * @param {*} data - The data to be included in the response. 
 * @returns  {Object} - The success response object.
 */
export function successResponse(data = null) {
  return {
    Succeeded: true,
    ErrorCode: 0,
    ErrorMessage: '',
    Data: data
  };
}

/**
 * The errorResponse function creates a standardized error response object.
 * 
 * @param {int} code - The error code to be included in the response.
 * @param {string} message - The error message to be included in the response.
 * @param {Object} data - Additional data to be included in the response.
 * @returns {Object} - The error response object.
 */
export function errorResponse(code = 1, message = 'Unknown error', data = null) {
  return {
    Succeeded: false,
    ErrorCode: code,
    ErrorMessage: message,
    Data: data
  };
}
