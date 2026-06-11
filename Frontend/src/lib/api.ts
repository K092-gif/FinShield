// API utility for frontend

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  // Merge headers properly so Authorization is NOT overwritten by Content-Type spread
  const { headers: extraHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders as Record<string, string>),
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText}`);
  }

  return response.json();
};
