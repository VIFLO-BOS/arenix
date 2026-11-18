/**
 * Default Privacy policy and Terms of use. The live text is stored in the database and is
 * editable under Settings, Legal. These are the defaults for a new install and the text the
 * owner loads into the live site.
 *
 * Public copy, so no dashes, colons, semicolons or hyphenated words. Written to match what the
 * code actually does. Change it when the data handling changes, and raise LEGAL_VERSION when a
 * change is significant, so the privacy notice is shown to visitors again.
 *
 * Not legal advice. Have both reviewed by a lawyer before ticking "reviewed" in Settings.
 */

import { LEGAL_UPDATED } from "./legal-version";

export { LEGAL_UPDATED, LEGAL_VERSION } from "./legal-version";

export const PRIVACY_POLICY = `Last updated ${LEGAL_UPDATED}

This policy explains what personal information areniX Technologies Limited collects, why we collect it, who we share it with, how long we keep it and the rights you have. It applies to this website, to people who contact us or work with us, and to the businesses we research as possible clients.

## Who we are

areniX Technologies Limited ("areniX", "we", "us") is a software and web development company in Nigeria. We decide how and why the personal information described here is used, which makes us the data controller under the Nigeria Data Protection Act 2023 and, for people in the United Kingdom, under the UK General Data Protection Regulation.

To contact us about privacy, use the Contact page on this website and start your message with the word Privacy.

## Information we collect

### When you contact us

The contact form asks for your name and email address, and optionally your company, phone number and preferred way of being contacted, together with your message and your consent choice.

### When you request a project

The project request form asks for the same contact details plus a description of your project, the features you need, your budget range and timeline. You may attach up to three files of up to 8 MB each. Please do not include sensitive personal information in attachments.

### When you request a consultation

We ask for your contact details, the type of meeting, a short summary of what you would like to discuss and the times that suit you. If we use an online scheduling service such as Cal.com, the details you enter there are also handled under that service's own privacy policy.

### When you message us on WhatsApp

The WhatsApp button opens a chat with our business number in your own WhatsApp app. The conversation is handled by WhatsApp under its own terms and privacy policy. We see the name and number on your WhatsApp account and what you write. Messages are not copied into our systems automatically.

### When you become a client

We keep the details needed to deliver and invoice our work, such as the names and work contact details of the people we work with, contracts, proposals, project messages and payment records.

### Information collected automatically

When you send a form we record a scrambled form of your IP address (a one way hash, so the address itself is not stored) and the type of browser you use. We use these only to stop spam and abuse. We also count clicks on some buttons, such as the WhatsApp button. These counts hold no personal information, no IP address and no identifier.

Like every website, our hosting provider keeps short lived technical logs of requests to the site for security and to keep the service running.

### Businesses we research

We research businesses that might benefit from our services. This is explained in full in the Business research section below.

## Cookies and similar technologies

This website does not use advertising cookies, tracking cookies or third party analytics.

When you close the privacy notice, your browser stores a small note saying you have seen it, so the notice does not appear on every page. This note stays on your device and is not sent to us.

Our staff dashboard uses one essential cookie to keep staff signed in. It is never set for ordinary visitors.

If we ever want to add analytics or other optional technologies, we will update this policy and ask for your permission first.

## How we use information and our legal basis

| Purpose | Legal basis |
|---|---|
| Replying to your message, preparing a proposal or arranging a consultation you asked for | Steps you asked us to take before a contract, and our legitimate interest in answering enquiries |
| Delivering, supporting and invoicing work for clients | Performance of our contract with you or your organisation |
| Keeping the website and our systems secure and preventing spam and abuse | Our legitimate interest in protecting our service |
| Researching businesses and contacting them about our services | Our legitimate interest in offering our services to businesses, balanced against the rights of the people involved as described below |
| Keeping business and tax records | Our legal obligations |
| Sending newsletters or other marketing to people who are not existing contacts | Your consent, which you can withdraw at any time. We do not send newsletters at present |

We do not use your information to make decisions about you that are made only by a computer and that have legal or similarly significant effects.

## Use of AI services

We use AI services from Anthropic, Google and OpenAI to search for and summarise public information about businesses, to suggest how well a business fits our services, and to draft messages that a member of our team reviews before anything is sent. A person always decides whether to contact a business. We do not send the messages you submit through our forms to AI services.

## Who we share information with

We share personal information only with service providers that help us run our business, under agreements that require them to protect it and to use it only on our instructions.

| Provider | What they do |
|---|---|
| Vercel | Hosts this website |
| MongoDB Atlas | Stores our database |
| Resend | Delivers our emails, such as replies and confirmations |
| Cal.com | Online scheduling, when we use it for consultations |
| Anthropic, Google and OpenAI | AI services used for business research and drafting, as described above |
| WhatsApp (Meta) | Messages you choose to send us on WhatsApp |

We may also share information with our professional advisers, with a buyer or successor if our business is sold or reorganised, and with authorities when the law requires it. We do not sell personal information.

## International transfers

Some of our providers store or process information outside Nigeria and the United Kingdom, mainly in the United States. When information leaves those countries we rely on the protections the law requires, such as contracts approved for international transfers, and we choose providers with strong security.

## How long we keep information

| Information | How long we keep it |
|---|---|
| Enquiries, project requests and consultation requests that do not lead to work | Up to 24 months after our last contact with you |
| Client records, contracts and invoices | For the length of our relationship and then up to six years, as tax and company law require |
| Security records, such as scrambled IP addresses and browser types | Up to 12 months |
| Research about a business that does not become a client | 12 months from when it was last updated |
| Our opt out list | For as long as we research businesses, so we can respect your choice. It holds only scrambled versions of email addresses and phone numbers |

You can ask us to delete your information sooner, as explained below.

## How we protect information

The website uses encrypted connections. Our database and dashboard can only be reached by staff whose roles need them, staff sign in with a password and a code sent to their email, passwords are stored in scrambled form, and important actions are recorded in an audit log. If a breach puts your information at risk, we will tell the relevant authority and, where required, you, within the time the law sets.

## Your rights

You can ask us to

- tell you whether we hold information about you and give you a copy
- correct information that is wrong or incomplete
- delete your information
- restrict how we use it
- object to how we use it, including to business research and to any marketing, which we will stop at once
- give you the information you provided in a common electronic format, or send it to another organisation
- withdraw any consent you gave, without affecting what we did before

To use any of these rights, contact us through the Contact page. We may ask you to confirm your identity. We will reply within one month, and there is no charge in most cases.

If you are unhappy with how we handle your information, please tell us first so we can put it right. You can also complain to the Nigeria Data Protection Commission (ndpc.gov.ng) or, in the United Kingdom, to the Information Commissioner's Office (ico.org.uk).

${businessResearchSection()}

## Children

This website and our services are meant for businesses and adults. We do not knowingly collect information from anyone under 18. If you think a child has sent us information, contact us and we will delete it.

## Links to other websites

This website links to other websites, such as projects we have built and WhatsApp. We are not responsible for how those websites handle your information. Please read their own policies.

## Changes to this policy

We will update this policy when the way we handle information changes. The date at the top shows when it last changed. When a change is significant, the privacy notice on this website will ask you to read it again.

## Contact us

For any question about this policy or your information, contact us through the Contact page on this website and start your message with the word Privacy.`;

// A function declaration, so it is available above where it is written.
function businessResearchSection() {
  return `## Business research

We look for businesses that might benefit from our services. To do this we read public sources such as business directories, map listings, company registries and the businesses' own websites, and we use AI services from Anthropic, Google and OpenAI to search and summarise that public information.

We keep the business name, its public contact details such as a general email address or phone number, its website and public facts about its online presence. Where a business's own website names its leaders, we may keep their names and job titles with a note of where we found them. We record the source and date of every detail.

The legal basis is our legitimate interest in offering our services to businesses. We never buy contact lists, never use information that is not public, and never send automated messages to these contacts. Any message comes from a member of our team and offers an easy way to say no.

Research about a business that does not become a client is deleted after twelve months. If you would like us to stop, tell us through the Contact page and include your website address. We will add it to our opt out list, delete what we hold, and not research or contact you again.

Our research tool identifies itself as areniXResearchBot and follows robots.txt. You can read more about it on the [research bot page](/research-bot).`;
}

export const TERMS_OF_USE = `Last updated ${LEGAL_UPDATED}

These terms apply to your use of this website. By using the website you accept them. If you do not accept them, please do not use the website.

## Who we are

This website is run by areniX Technologies Limited ("areniX", "we", "us"), a software and web development company in Nigeria. You can contact us through the Contact page.

## Using this website

You may use this website to learn about areniX and our work and to contact us. When you use it you agree not to

- break any law or help anyone else to do so
- send false information, spam or messages meant to harass or mislead
- try to get into parts of the website or our systems that are not meant for you, including the staff dashboard
- upload or send viruses or any other harmful code
- copy large parts of the website automatically, or put a load on it that could slow it down for others
- copy our designs, text or code to pass them off as your own

We may block access for anyone who does not follow these terms.

## Information on this website

The information on this website is general information about our services. It is not professional advice for your situation, and it may change at any time. Descriptions of past projects show the work as it was at the time. Prices, timelines and features are only fixed when we agree them in writing.

## Enquiries, proposals and contracts

Sending a form, a message or a consultation request does not create a contract. Any work we do for you is governed by a separate written proposal or agreement that sets out the scope, fees, timeline and terms, and that agreement takes priority over these terms.

## Consultations

A consultation request is only booked once we confirm it. We may decline or move a request. Unless we agree otherwise in writing, a first consultation is free and creates no obligation on either side.

## Files and information you send us

When you send us text or files, you confirm that you have the right to share them. You allow us to use them to reply to you, to prepare a proposal and to do any work we agree. We treat what you send as confidential and handle personal information as our Privacy policy describes. Please do not send passwords or sensitive personal information through our forms.

## Intellectual property

The text, design, graphics and code of this website belong to areniX or to those who licensed them to us. You may view and print pages for your own use or for your organisation's internal use. Any other use needs our written permission. Names, logos and trademarks of projects and clients shown on this website belong to their owners and appear with permission or as a factual record of work we delivered.

## Links and other services

This website links to other websites and services, such as projects we have built, WhatsApp and online scheduling. We do not control them and are not responsible for their content or their terms. Your use of them is governed by their own terms.

## Availability

We aim to keep the website available and accurate, but we do not promise that it will always be available, free of errors or free of harmful code. We may change, suspend or withdraw any part of it at any time.

## Our responsibility to you

We provide this website as it is, without any promise beyond what the law requires. To the extent the law allows, we are not responsible for any loss that comes from relying on information on this website, from being unable to use it, or for any loss of profit, business or data.

Nothing in these terms limits our responsibility where the law does not allow it to be limited, for example for fraud, or for death or personal injury caused by our negligence. If you use the website as a consumer, you also keep any rights that the law of your country gives you and that cannot be removed by agreement.

## Your responsibility to us

If you break these terms and that causes us loss, you agree to cover our reasonable losses and costs, to the extent the law allows.

## Privacy

Our Privacy policy explains how we handle personal information. It forms part of these terms.

## Changes to these terms

We may update these terms from time to time. The date at the top shows when they last changed. The version on this website when you use it is the one that applies.

## Law and disputes

These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria may decide any dispute about them. Before going to court, we ask that you contact us so we can try to settle the matter together. If you live in another country, you may also have the right to bring a claim in your own courts.

## Contact us

For any question about these terms, contact us through the Contact page on this website.`;
