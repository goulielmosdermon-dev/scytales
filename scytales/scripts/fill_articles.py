#!/usr/bin/env python3
"""Fill CMS article bodies from scytales.com post content."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "content" / "articles"
CONTACT = "./index.html#contact"
FUTURE = "./article.html?slug=the-future-of-identification-mobile-ids-vs-traditional-ids"
VALIDATOR = "./article.html?slug=mobile-validator-sdk-the-tool-powering-digital-identity-wallets"


def p(html: str):
    return {"type": "p", "html": html}


def h2(text: str):
    return {"type": "h2", "text": text}


def h3(text: str):
    return {"type": "h3", "text": text}


def ul(items: list[str], html: bool = False):
    block = {"type": "ul", "items": items}
    if html:
        block["htmlItems"] = True
    return block


def quote(html: str):
    return {"type": "blockquote", "html": html}


def figure(caption: str, key: str):
    return {"type": "figure", "caption": caption, "dropKey": key}


SDK_ITEMS = [
    "Can be implemented in just under 6 weeks",
    "Can be easily integrated with the currently implemented solution and act as an add-on",
    "By having a high level of assurance validation, you can ensure the identity of your users",
    "Checking in using the mobile validator ensures the person accessing the services is who they say they are",
    "Ensure the privacy of your guests by requesting only the data you need",
    "Compliance with KYC, AML, GDPR and eIDAS 2.0 regulations, as well as with ISO 18013 parts 5 and 7",
    "Compliant with the European Digital Identity Architecture and Reference Framework (the European Digital Identity Wallet of which Scytáles are the technology developers), ISO 18013 part 5 and part 7 driving licences and mobile IDs",
    "Compliant with OID4VCI, OID4VP and SIOPv2, where DIF JWT VC Presentation Profile uses OID4VP as the base protocol for the request and verification of W3C JWT VCs, and uses SIOPv2 for user authentication; while NIST (National Cybersecurity Center of Excellence) plans to implement reference implementation for OID4VP to present mdocs/mDL",
    "Fully certified solutions",
]

PRICING = "To cater to diverse needs, we offer different pricing solutions and business models. Our transparent policy ensures that you have the flexibility to choose the option that aligns best with your organization’s requirements."


def sdk_section(*, pricing_in_list: bool = False):
    items = list(SDK_ITEMS)
    out = [h2("Scytáles technology available as SDKs"), ul(items)]
    if pricing_in_list:
        items.append(PRICING)
        out = [h2("Scytáles technology available as SDKs"), ul(items)]
    else:
        out.append(p(PRICING))
    out.append(
        p(f'<a href="{CONTACT}">Contact us now</a> to get your 30-day free trial on our SDKs.')
    )
    return out


def trusted_section():
    return [
        h2("Scytáles, Your Trusted ID Verification Provider"),
        p(
            "At Scytáles, we are thrilled to share groundbreaking developments in digital identity that are set to revolutionize the way we authenticate and interact remotely online and face-to-face."
        ),
        p(
            "<strong>Proven track record:</strong> Implementors of the first full ISO 18013-5 compliant Mobile Driver’s License program in the US in the State of Utah and technology providers of the European Digital Identity Wallet (EUDI Wallet) which will soon be rolled out to more than 440 million European citizens, with our technology being broadly used across the globe."
        ),
        p(
            "<strong>Expert Representation in several standardization bodies:</strong> Scytáles represents Sweden as an expert through the Standardization Body (SIS) SIS/TK 448 and Task Force 14 on mDL within ISO/IEC 18013-5 ISO/IEC JTC1/SC17/WG10."
        ),
        p(
            "<strong>Global leaders in mobile IDs:</strong> Scytáles is the leading developer of ISO-Mobile Driving Licenses, Mobile IDs and Derived Mobile IDs as a complement to Security Printed Documents and Validation mechanisms."
        ),
        p(
            "<strong>Providers of the most comprehensive validation solution:</strong> Our Mobile Validator is built focused on privacy, allowing for all validation scenarios, in real-time in online and offline modes, over the counter and over the web/remotely."
        ),
        p(
            "<strong>High level of Assurance identification at our core:</strong> Our product portfolio showcases the different solutions we offer the market for secure, interoperable and trustworthy identification credentials."
        ),
    ]


BODIES: dict[str, list] = {}

# --- FaceTec ---
BODIES["facetec-and-scytales-enter-strategic-partnership"] = [
    p(
        "<strong>Scytáles AB</strong> and <strong>FaceTec</strong> announce that the two companies have entered into a strategic partnership based on their diverse but complementary capabilities within mobile user authentication and digital identity verification."
    ),
    p(
        "Both companies are globally recognized technology leaders and frontrunners with pioneering products and services adhering to the highest standards that, together, will provide an unparalleled secure identity verification foundation for an increasingly interconnected digital economy. With this partnership, FaceTec and Scytáles will provide the most robust, seamless identification process available for billions of users."
    ),
    p(
        "Scytáles is the leader in the new ISO 18013-5 mobile ID technology standard that can use an official driving license, ID Card, national ID, or vaccination certificate on a citizen’s smartphone for contactless verification with a tap or scan, and that is accepted worldwide. Scytáles also offers CSP (Credentials Service Manager) solutions and Derived Mobile ID for complementary digital identification solutions and travel documents using smart devices and validation mechanisms in real-time, and that can operate in both online and offline modes."
    ),
    p(
        "FaceTec’s security solutions focus on authenticating an individual, and does not involve surveillance or information mining. Their proprietary 3D AI solution uniquely determines if the individual user is alive and present, and uses exceptionally accurate biometric face matching to verify the individual user’s identity. Within a two-second, simple selfie authentication process, FaceTec’s 3D Liveness detection verifies the user’s identity in real-time, capturing up to 100 video frames, and can then match the user’s 3D FaceMap to their photo ID or the face image captured during enrollment. Each time the user returns, FaceTec’s ongoing authentication proves Liveness and again compares their new 3D FaceMap to the stored image. If matched, access is granted with no password required."
    ),
    quote(
        '<p>“We are thrilled to partner with Scytáles, an internationally recognized leader in mobile ID verification,” said Kevin Alan Tussy, CEO of FaceTec. “Their stellar work in national IDs, travel documents and resident permits, healthcare cards, corporate cards, and smart and loyalty cards in government and enterprise, is an excellent fit for our advanced 3D AI face verification technology. We are looking forward to working with Scytáles on many important mobile ID projects in the years to come.”</p>'
    ),
    quote(
        '<p>“The partnership between our two companies is really exciting since we combine the power of our ISO-technology with FaceTec’s world-class 3D face authentication solution,” says Konstantin Papaxanthis, CEO, Scytáles.</p>'
    ),
    h2("About Scytáles"),
    p(
        "Scytáles is the leading developer of ISO-Mobile Driving Licenses and Mobile IDs as a complement to Security Printed Documents and Validation mechanisms. With our fully ISO-compliant technology, we are the global leaders of the new generation of personal credentials using a cell phone while authorizing what data will be shared. We enable going mobile and validating in real-time in online and offline modes, by standardization and using NFC, Bluetooth, QR Codes, Wifi Aware, PDF417 and other technologies as per defined in ICAO 9303 and ISO 18013-5. Scytáles AB represents Sweden as an expert through the Standardization Body (SIS) SIS/TK 448 and Task Force 14 on mDL within ISO/IEC 18013-5 ISO/IEC JTC1/SC17/WG10. Headquarters in Stockholm, Sweden and offices in the US, Greece and Portugal."
    ),
    h2("About FaceTec"),
    p(
        "Founded in 2013, with team members in the United States, Brazil, Portugal, and Singapore, FaceTec is fast becoming the global standard in 3D face biometrics, powering remote identity platforms on six continents for government agencies like the U.S. Department of Homeland Security, Canadian Parliament, SmartDubai, DataPrev Brazil; and for private organizations including Mercado Libre, Nubank, BBVA, MeetGroup, Voice.com, and hundreds more. FaceTec’s internationally patented, industry-leading 3D Face Authentication software anchors the chain of trust in mobile digital identity ecosystems with the world’s strongest Certified Liveness Detection, and most accurate 3D Face Matching and Age Estimation."
    ),
]

# --- Deutsche Telekom / Age Verification ---
BODIES["deutsche-telekom-and-scytales-awarded-european-digital-identity-initiative-on-age-verification"] = [
    h2("EU-Wide Digital Age Verification System Protects Minors and Upholds Privacy"),
    p(
        "<strong>Scytáles AB</strong>, a Swedish-based digital identity specialist, in partnership with <strong>Deutsche Telekom AG</strong>, via its subsidiary <em>T-Systems International GmbH</em>, has been selected by the <strong>European Commission</strong> to develop a revolutionary age verification solution. The contract for an Age Verification Solution is a landmark project that advances the EU’s Digital Services Act (DSA) initiatives and sets new standards for digital identity management. The solution will encompass a privacy-centric approach that ensures personal data is protected while providing a robust method of age verification."
    ),
    p(
        "<strong>As the technology provider for the EUDI Wallet, Scytáles</strong> is perfectly positioned to partner with Deutsche Telekom in developing a solution that meets the rigorous standards required for EU-wide age verification. Together, these companies can deliver a secure, scalable, and privacy-compliant age verification system across the EU, ensuring full adherence to the EU’s stringent digital identity management requirements."
    ),
    h3("Age verification is set to be a cornerstone of the EU’s digital strategy"),
    p(
        "The solution will seamlessly integrate with the upcoming European Digital Identity Wallet (EUDI Wallet) and allow citizens to verify their age online without revealing personal data. This innovation tackles a critical challenge in online safety: protecting minors while maintaining user privacy."
    ),
    quote(
        '<p>“Secure user identification is critical for digital applications. Additionally, ensuring the safety, security, and privacy of minors is a top priority in the Commission’s Better Internet for Kids (BIK+) strategy. The EUDI wallet will streamline the daily digital interactions of EU citizens and businesses. We’re thrilled to have been awarded the contract for an Age Verification Solution by the EU and are proud to see our technology recognized once again.” <strong>Konstantin Papaxanthis, CEO of Scytáles</strong></p>'
    ),
    quote(
        '<p>“With secure digital identities, we are now restoring digital sovereignty to EU citizens and ensuring greater protection for minors. When we go online, we have little control over how our personal data is used by websites and stores. Now the technology confirms that someone really is who they say they are. An easy logging in without passwords for online citizen services, banking transactions or travel - simple and secure.” <strong>Ferri Abolhassan, CEO of T-Systems and member of the Board of Management of Deutsche Telekom AG</strong></p>'
    ),
    h3("Key features and benefits:"),
    ul(
        [
            "Enables access to age-restricted online services without sharing additional personal data",
            "Easy to use and accessible to everyone, including to those with disabilities",
            "Full compliance with EU privacy standards",
            "Seamless integration with existing digital services",
            "User control over personal data sharing",
        ]
    ),
    h3("Empowering citizens to reclaim control over their digital identities"),
    p(
        "The project, funded through the Digital Europe Programme, aligns with the EU’s 2026 deadline for member states to implement digital identity wallets. This initiative represents a crucial step toward empowering citizens to regain control of their digital identity while ensuring a safer online environment for all Europeans. EU citizens and residents will be able to securely verify their age with the solution after successful implementations in the Member States."
    ),
    h2("ABOUT"),
    h3("Scytáles"),
    p(
        "Scytáles is actively developing the EUDI Wallet Reference Implementation for the EU Commission and providing support in drafting the EUDI Wallet Architecture and Reference Framework (ARF). This positions Scytáles as an ideal partner for creating a solution that meets the ARF specifications. Scytáles is well-equipped to offer valuable strategic insights to Member States, Issuers and relying partners as they develop their own solutions. Scytáles is a product company and has for 10 years been at the forefront of digital security, pioneering solutions that protect digital identities across the globe, developing and successfully implementing mobile driving licenses, mobile IDs, derived mobile IDs, digital identity wallets and solutions for connected ecosystems."
    ),
    h3("Deutsche Telekom"),
    p(
        "Deutsche Telekom is a partner of the EU in the introduction of digital identities. The company is taking part in the EU’s field tests. The activation of mobile phone cards is being tested. The tests are taking place in Germany, France, Austria, Poland, the Netherlands, Greece and Ukraine. Every second health ID for people with statutory health insurance from Deutsche Telekom. The technology is already being used in Germany. More than half of those with statutory health insurance will have a digital identity from Deutsche Telekom in the future. Telekom’s IT division T-Systems has won contracts from AOK and Barmer. Under the Digital Care and Nursing Modernization Act (DVPMG), statutory health insurance companies are obliged to introduce secure digital identities. These are intended to supplement existing ID procedures such as identification using an electronic health card (eGK)."
    ),
    h2("MEDIA CONTACTS"),
    h3("About Scytáles AB"),
    p(
        'www.scytales.com<br><a href="https://www.linkedin.com/company/scytales-ab/" target="_blank" rel="noopener noreferrer">LinkedIn</a><br><strong>E-Mail:</strong> <a href="mailto:info@scytales.com">info@scytales.com</a><br><strong>Tel.:</strong> 0046 (0) 70 988 60 48'
    ),
    h3("About Deutsche Telekom AG"),
    p(
        '<a href="https://www.telekom.com/companyprofile" target="_blank" rel="noopener noreferrer">telekom.com/companyprofile</a><br>Deutsche Telekom AG<br>Corporate Communications<br><strong>Tel.:</strong> +49 228 181 – 49494<br><strong>E-Mail:</strong> media@telekom.de'
    ),
]

print("partial write ok — continuing in part 2")
# Save helpers + first bodies for next chunk via import pattern
Path("/tmp/_fill_partial.json").write_text(
    json.dumps({k: v for k, v in BODIES.items()}, ensure_ascii=False)
)
print("saved", len(BODIES), "to /tmp/_fill_partial.json")
