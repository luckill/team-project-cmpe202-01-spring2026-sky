function normalizeLocationPart(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseLocationAddress(value) {
  const segments = String(value ?? "")
    .split(",")
    .map(normalizeLocationPart)
    .filter(Boolean);

  if (segments.length === 0) {
    return { address: "", city: "", state: "", country: "" };
  }

  if (segments.length === 1) {
    return { address: segments[0], city: "", state: "", country: "" };
  }

  if (segments.length === 2) {
    const [address, city] = segments;
    return { address, city, state: "", country: "" };
  }

  if (segments.length === 3) {
    const [address, city, country] = segments;
    return { address, city, state: "", country };
  }

  const country = segments.pop() ?? "";
  const state = segments.pop() ?? "";
  const city = segments.pop() ?? "";

  return {
    address: segments.join(", "),
    city,
    state,
    country
  };
}

export function formatLocationAddress({
  address = "",
  city = "",
  state = "",
  country = ""
} = {}) {
  return [address, city, state, country]
    .map(normalizeLocationPart)
    .filter(Boolean)
    .join(", ");
}
