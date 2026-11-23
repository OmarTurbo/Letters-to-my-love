export const TITLE_MAX = 200;
export const CONTENT_MAX = 50000;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
  }
}

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

export function toUtcMidnight(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));

  if (!match) {
    throw new ValidationError("Date must be a valid YYYY-MM-DD date.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError("Date must be a valid YYYY-MM-DD date.");
  }

  return date;
}

export function parseDisplayDate(value, fallback = new Date()) {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(
    String(value ?? "").trim()
  );

  if (!match) {
    return toUtcMidnight(fallback);
  }

  const key = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const month = MONTHS[key];
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month === undefined) {
    return toUtcMidnight(fallback);
  }

  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return toUtcMidnight(fallback);
  }

  return date;
}

export function parseLetterInput(body, { partial = false, now = new Date() } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be an object.");
  }

  const data = {};

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new ValidationError("Title is required.");
    }

    const title = body.title.trim();

    if (title.length > TITLE_MAX) {
      throw new ValidationError(
        `Title must be at most ${TITLE_MAX} characters.`
      );
    }

    data.title = title;
  }

  if (!partial || body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new ValidationError("Content is required.");
    }

    const content = body.content.trim();

    if (content.length > CONTENT_MAX) {
      throw new ValidationError(
        `Content must be at most ${CONTENT_MAX} characters.`
      );
    }

    data.content = content;
  }

  if (!partial || body.date !== undefined) {
    if (body.date === undefined || body.date === null || body.date === "") {
      if (!partial) {
        data.date = toUtcMidnight(now);
      }
    } else {
      data.date = parseDateInput(body.date);
    }
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ValidationError("No fields to update.");
  }

  return data;
}

export function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(date));
}

export function formatDateISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function toApiLetter(doc) {
  const raw = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(raw._id),
    title: raw.title,
    content: raw.content,
    date: formatDisplayDate(raw.date),
    dateISO: formatDateISO(raw.date),
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString()
  };
}
