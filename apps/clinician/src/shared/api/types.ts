export type ApiParamValue = string | number | boolean | null | undefined;

export type ApiParams = Record<string, ApiParamValue>;

export type EntityId = string | number;

export type ApiPayload = Record<string, unknown>;

export type ApiHeaders = Record<string, string>;

export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  params?: ApiParams;
  headers?: ApiHeaders;
  includeFacilityId?: boolean;
};

export type ApiErrorData = Record<string, unknown> | null;

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type ApiBlobResponse = {
  blob: Blob;
  contentDisposition: string;
  contentType: string;
};
