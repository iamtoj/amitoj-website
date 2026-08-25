import { expect, type Page, type Request, type Route, test } from './fixtures/site-test';

const endpoint = 'https://formspree.io/f/mlgjdrwp';
const validMessage = {
  category: 'research',
  name: 'Ada Reader',
  email: 'ada@example.com',
  message: 'The distinction between attention and direction left me with a question.',
} as const;

type ResponsePlan = (route: Route) => Promise<void> | void;

async function installFormspreeMock(page: Page, plans: ResponsePlan[] = []) {
  const queue = [...plans];
  const requests: Request[] = [];
  const unexpected: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isFormspree = url.hostname === 'formspree.io' || url.hostname.endsWith('.formspree.io');
    const isExternalPost = request.method() === 'POST' && url.origin !== 'http://127.0.0.1:4327';

    if (isFormspree || isExternalPost) {
      requests.push(request);
      const plan = request.method() === 'POST' && request.url() === endpoint ? queue.shift() : undefined;
      if (plan) {
        await plan(route);
        return;
      }
      unexpected.push(`${request.method()} ${request.url()}`);
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });

  return {
    requests,
    assertDone() {
      expect(unexpected, 'No Formspree request may escape the explicit mock queue').toEqual([]);
      expect(queue, 'Every queued Formspree response must be consumed').toHaveLength(0);
      for (const request of requests) {
        expect(request.url()).toBe(endpoint);
        expect(request.method()).toBe('POST');
      }
    },
  };
}

const jsonResponse = (status: number, body: unknown = {}) => async (route: Route) => {
  const response = status === 204
    ? { status, headers: { 'access-control-allow-origin': '*' } }
    : {
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(body),
      };
  await route.fulfill(response);
};

async function fillValidForm(page: Page) {
  await page.locator('#category').selectOption(validMessage.category);
  await page.locator('#name').fill(validMessage.name);
  await page.locator('#email').fill(validMessage.email);
  await page.locator('#message').fill(validMessage.message);
}

async function expectRetainedValues(page: Page) {
  await expect(page.locator('#category')).toHaveValue(validMessage.category);
  await expect(page.locator('#name')).toHaveValue(validMessage.name);
  await expect(page.locator('#email')).toHaveValue(validMessage.email);
  await expect(page.locator('#message')).toHaveValue(validMessage.message);
}

function multipartFields(request: Request) {
  const body = request.postData() ?? '';
  return Object.fromEntries(
    [...body.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)]
      .map(([, name, value]) => [name, value]),
  );
}

function urlEncodedFields(request: Request) {
  return Object.fromEntries(new URLSearchParams(request.postData() ?? ''));
}

test('@native-contact the static form keeps native validation and a no-JavaScript Formspree action', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const mock = await installFormspreeMock(page);
  await page.goto('/contact');
  const form = page.locator('#contact-form');
  await expect(form).toHaveAttribute('action', endpoint);
  await expect(form).toHaveAttribute('method', 'POST');
  await expect(form).not.toHaveAttribute('novalidate', /.*/);
  await expect(page.locator('#category')).toHaveAttribute('aria-describedby', 'category-error');
  await expect(page.locator('#name')).toHaveAttribute('aria-describedby', 'name-error');
  await expect(page.locator('#email')).toHaveAttribute('aria-describedby', 'email-error');
  await expect(page.locator('#message')).toHaveAttribute('aria-describedby', 'message-error');
  await expect(page.locator('#category')).toHaveAttribute('required', '');
  await expect(page.locator('#name')).toHaveAttribute('required', '');
  await expect(page.locator('#email')).toHaveAttribute('required', '');
  await expect(page.locator('#message')).toHaveAttribute('required', '');
  await expect(page.locator('#name')).toHaveAttribute('maxlength', '100');
  await expect(page.locator('#name')).toHaveAttribute('autocomplete', 'name');
  await expect(page.locator('#email')).toHaveAttribute('maxlength', '254');
  await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
  await expect(page.locator('#email')).toHaveAttribute('inputmode', 'email');
  await expect(page.locator('#message')).toHaveAttribute('maxlength', '5000');
  await expect(page.locator('#message')).toHaveAttribute('rows', '7');
  await expect(page.locator('#category option')).toHaveText([
    'Choose one',
    'A response to something here',
    'Research or organizational work',
    'Coaching',
    'Yoga',
    'Photography',
    'Something else',
  ]);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#category')).toBeFocused();
  expect(mock.requests).toHaveLength(0);
  mock.assertDone();
  await context.close();
});

test('@native-contact a valid no-JavaScript form serializes the exact native POST without reaching Formspree', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const mock = await installFormspreeMock(page, [jsonResponse(200)]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  expect(mock.requests).toHaveLength(1);
  const request = mock.requests[0];
  expect((await request.allHeaders())['content-type']).toContain('application/x-www-form-urlencoded');
  expect(urlEncodedFields(request)).toEqual({
    category: validMessage.category,
    name: validMessage.name,
    email: validMessage.email,
    message: validMessage.message,
    source: 'amitoj.co/contact',
    _gotcha: '',
  });
  mock.assertDone();
  await context.close();
});

test('an empty form renders the reviewed local errors without a request', async ({ page }) => {
  const mock = await installFormspreeMock(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('#category-error')).toHaveText('Choose what brings you here.');
  await expect(page.locator('#name-error')).toHaveText('Enter your name.');
  await expect(page.locator('#email-error')).toHaveText('Enter your email address.');
  await expect(page.locator('#message-error')).toHaveText('Enter a message.');
  await expect(page.locator('#category')).toBeFocused();
  expect(mock.requests).toHaveLength(0);
  mock.assertDone();
});

test('a malformed email is rejected locally and repaired errors clear on input', async ({ page }) => {
  const mock = await installFormspreeMock(page);
  await page.goto('/contact');
  await page.locator('#category').selectOption('research');
  await page.locator('#name').fill('Ada Reader');
  await page.locator('#email').fill('not-an-email');
  await page.locator('#message').fill('A question.');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('#email-error')).toHaveText('Enter an email address in the form name@example.com.');
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#email')).toBeFocused();
  expect(mock.requests).toHaveLength(0);
  await page.locator('#email').fill('ada@example.com');
  await expect(page.locator('#email-error')).toBeEmpty();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'false');
  mock.assertDone();
});

test('oversized values are rejected locally even when assigned beyond HTML maxlength', async ({ page }) => {
  const mock = await installFormspreeMock(page);
  await page.goto('/contact');
  await page.locator('#category').selectOption('research');
  await page.locator('#name').evaluate((field) => { (field as HTMLInputElement).value = 'n'.repeat(101); });
  await page.locator('#email').evaluate((field) => { (field as HTMLInputElement).value = `${'e'.repeat(250)}@x.co`; });
  await page.locator('#message').evaluate((field) => { (field as HTMLTextAreaElement).value = 'm'.repeat(5001); });
  await page.locator('#contact-form').evaluate((form) => { (form as HTMLFormElement).requestSubmit(); });

  await expect(page.locator('#name-error')).toHaveText('Keep your name to 100 characters or fewer.');
  await expect(page.locator('#email-error')).toHaveText('Keep your email address to 254 characters or fewer.');
  await expect(page.locator('#message-error')).toHaveText('Keep your message to 5000 characters or fewer.');
  await expect(page.locator('#name')).toBeFocused();
  expect(mock.requests).toHaveLength(0);
  mock.assertDone();
});

test('a valid mocked response sends exact FormData, announces progress, resets, and restores button focus', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const mock = await installFormspreeMock(page, [async (route) => {
    await responseGate;
    await jsonResponse(204)(route);
  }]);
  await page.goto('/contact');
  await fillValidForm(page);
  const button = page.getByRole('button', { name: 'Send message' });
  await button.focus();
  await button.click();

  await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Sending your message…');
  await expect.poll(() => mock.requests.length).toBe(1);
  releaseResponse();

  await expect(page.getByRole('status')).toHaveText('Your message was sent.');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeFocused();
  for (const id of ['category', 'name', 'email', 'message']) {
    await expect(page.locator(`#${id}`)).toHaveValue('');
  }

  const request = mock.requests[0];
  expect((await request.allHeaders()).accept).toBe('application/json');
  expect(multipartFields(request)).toEqual({
    category: validMessage.category,
    name: validMessage.name,
    email: validMessage.email,
    message: validMessage.message,
    source: 'amitoj.co/contact',
    _gotcha: '',
  });
  mock.assertDone();
});

test('a successful response does not depend on a parseable provider body', async ({ page }) => {
  const mock = await installFormspreeMock(page, [async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{malformed',
    });
  }]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('status')).toHaveText('Your message was sent.');
  for (const id of ['category', 'name', 'email', 'message']) {
    await expect(page.locator(`#${id}`)).toHaveValue('');
  }
  expect(mock.requests).toHaveLength(1);
  mock.assertDone();
});

test('a delayed response ignores a second submit while the first is pending', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const mock = await installFormspreeMock(page, [async (route) => {
    await responseGate;
    await jsonResponse(200)(route);
  }]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => mock.requests.length).toBe(1);
  await page.locator('#contact-form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });
  const secondEventCanceled = await page.locator('#contact-form').evaluate((form) => {
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(secondEventCanceled).toBe(true);
  await page.locator('#email').focus();
  await page.keyboard.press('Enter');
  expect(mock.requests).toHaveLength(1);
  releaseResponse();
  await expect(page.getByRole('status')).toHaveText('Your message was sent.');
  mock.assertDone();
});

test('a delayed success preserves both an in-flight edit and the visitor\'s chosen focus', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const mock = await installFormspreeMock(page, [async (route) => {
    await responseGate;
    await jsonResponse(200)(route);
  }]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => mock.requests.length).toBe(1);

  const unsentEdit = 'A second thought written while the first message was sending.';
  await page.locator('#message').fill(unsentEdit);
  releaseResponse();
  await expect(page.getByRole('status')).toHaveText('Your message was sent.');
  await expect(page.locator('#message')).toHaveValue(unsentEdit);
  await expect(page.locator('#message')).toBeFocused();
  expect(multipartFields(mock.requests[0]).message).toBe(validMessage.message);
  mock.assertDone();
});

test('a delayed provider error does not mark a newer field value invalid', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const mock = await installFormspreeMock(page, [async (route) => {
    await responseGate;
    await jsonResponse(422, { errors: [{ field: 'email', message: 'provider detail' }] })(route);
  }]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => mock.requests.length).toBe(1);

  await page.locator('#email').fill('newer@example.com');
  releaseResponse();
  await expect(page.getByRole('status')).toHaveText('Your message was not sent. Your words are still here; try again.');
  await expect(page.locator('#email')).toHaveValue('newer@example.com');
  await expect(page.locator('#email-error')).toBeEmpty();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#email')).toBeFocused();
  mock.assertDone();
});

for (const status of [400, 422]) {
  test(`a mocked ${status} uses only allowlisted local field copy and retains values`, async ({ page }) => {
    const providerPayload = { errors: [{ field: 'email', message: '<img src=x onerror=alert(1)> provider detail' }] };
    const mock = await installFormspreeMock(page, [jsonResponse(status, providerPayload)]);
    await page.goto('/contact');
    await fillValidForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('status')).toHaveText('Your message was not sent. Your words are still here; try again.');
    await expect(page.locator('#email-error')).toHaveText('Check your email address and try again.');
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('main')).not.toContainText('provider detail');
    await expect(page.locator('main img[src="x"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'false');
    await expectRetainedValues(page);
    mock.assertDone();
  });

  test(`a malformed mocked ${status} body stays local, generic, and retryable`, async ({ page }) => {
    const mock = await installFormspreeMock(page, [async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '{malformed',
      });
    }]);
    await page.goto('/contact');
    await fillValidForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('status')).toHaveText('Your message was not sent. Your words are still here; try again.');
    for (const name of ['category', 'name', 'email', 'message']) {
      await expect(page.locator(`#${name}-error`)).toBeEmpty();
    }
    await expectRetainedValues(page);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'false');
    expect(mock.requests).toHaveLength(1);
    mock.assertDone();
  });
}

test('a mocked 429 keeps the message and gives the reviewed wait-and-retry instruction', async ({ page }) => {
  const mock = await installFormspreeMock(page, [jsonResponse(429)]);
  await page.goto('/contact');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toHaveText('Too many messages were submitted at once. Wait a moment, then try again.');
  await expectRetainedValues(page);
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  mock.assertDone();
});

for (const failure of ['500', 'aborted network'] as const) {
  test(`${failure} retains values and permits a successful retry`, async ({ page }) => {
    const firstPlan: ResponsePlan = failure === '500'
      ? jsonResponse(500)
      : async (route) => { await route.abort('failed'); };
    const mock = await installFormspreeMock(page, [firstPlan, jsonResponse(200)]);
    await page.goto('/contact');
    await fillValidForm(page);
    const button = page.getByRole('button', { name: 'Send message' });
    await button.click();
    await expect(page.getByRole('status')).toHaveText('Your message was not sent. Your words are still here; try again.');
    await expectRetainedValues(page);
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByRole('status')).toHaveText('Your message was sent.');
    expect(mock.requests).toHaveLength(2);
    mock.assertDone();
  });
}

test('a local timeout reports unconfirmed delivery without inviting an immediate retry', async ({ page }) => {
  await page.addInitScript(() => {
    window.fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const rejectAsAborted = () => reject(new DOMException('Aborted', 'AbortError'));
      if (signal?.aborted) {
        rejectAsAborted();
      } else {
        signal?.addEventListener('abort', rejectAsAborted, { once: true });
      }
    });
  });
  const mock = await installFormspreeMock(page);
  await page.goto('/contact');
  await page.clock.install();
  await fillValidForm(page);
  const button = page.getByRole('button', { name: 'Send message' });
  await button.focus();
  await button.click();

  await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'true');
  await page.clock.fastForward(15_000);
  await expect(page.getByRole('status')).toHaveText('Delivery could not be confirmed. Your words are still here; sending again may create a duplicate.');
  await expect(page.getByRole('status')).not.toContainText('try again');
  await expectRetainedValues(page);
  await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'false');
  await expect(button).toBeEnabled();
  await expect(button).toHaveText('Send message');
  await expect(button).toBeFocused();
  expect(mock.requests).toHaveLength(0);
  mock.assertDone();
});

test('only the four reviewed about values preselect a category', async ({ page }) => {
  const mock = await installFormspreeMock(page);
  for (const value of ['coaching', 'yoga', 'photography', 'research']) {
    await page.goto(`/contact?about=${value}`);
    await expect(page.locator('#category')).toHaveValue(value);
  }
  for (const value of ['response', 'other', 'COACHING', '<script>']) {
    await page.goto(`/contact?about=${encodeURIComponent(value)}`);
    await expect(page.locator('#category')).toHaveValue('');
  }
  mock.assertDone();
});

test('the honeypot is submitted but stays out of the tab order and accessibility tree', async ({ page }) => {
  const mock = await installFormspreeMock(page, [jsonResponse(200)]);
  await page.goto('/contact');
  const honeypot = page.locator('#_gotcha');
  await expect(honeypot).toHaveAttribute('tabindex', '-1');
  await expect(honeypot).toHaveAttribute('autocomplete', 'off');
  await expect(honeypot.locator('xpath=..')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('textbox', { name: 'Leave this field empty' })).toHaveCount(0);
  const hiding = await honeypot.evaluate((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return { display: style.display, visibility: style.visibility, right: box.right };
  });
  expect(hiding.display).not.toBe('none');
  expect(hiding.visibility).not.toBe('hidden');
  expect(hiding.right).toBeLessThanOrEqual(0);
  await expect(page.locator('#contact-form #contact-status')).toHaveCount(0);
  await expect(page.locator('#contact-form + #contact-status')).toHaveCount(1);

  await page.locator('#category').focus();
  for (const expectedId of ['name', 'email', 'message']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${expectedId}`)).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeFocused();

  await fillValidForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toHaveText('Your message was sent.');
  expect(multipartFields(mock.requests[0])._gotcha).toBe('');
  mock.assertDone();
});
