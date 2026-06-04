import { useStore } from '../data/store'

type Kind = 'terms' | 'privacy' | 'refund' | 'shipping'

const titles: Record<Kind, string> = {
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  refund: 'Refund & Returns Policy',
  shipping: 'Shipping Policy',
}

function content(kind: Kind, store: string): { h: string; p: string[] }[] {
  switch (kind) {
    case 'terms':
      return [
        { h: 'Agreement to terms', p: [`By accessing and using the ${store} website and placing an order, you agree to be bound by these Terms of Use. If you do not agree, please do not use our website.`] },
        { h: 'Products & pricing', p: ['We make every effort to display product colours, details and prices accurately. Prices are listed in Egyptian Pounds (EGP) and may change without notice. We reserve the right to limit quantities or refuse any order.'] },
        { h: 'Orders', p: ['When you place an order, you will receive a confirmation and our team may contact you by phone to verify the details. We reserve the right to cancel any order due to stock availability, pricing errors, or suspected fraud.'] },
        { h: 'Intellectual property', p: [`All content on this website, including the ${store} logo, images, text and designs, is our property and may not be copied or reused without written permission.`] },
        { h: 'Limitation of liability', p: [`${store} is not liable for any indirect or incidental damages arising from the use of our products or website, to the maximum extent permitted by law.`] },
        { h: 'Contact', p: ['For any questions about these terms, contact us through the details on our Contact page.'] },
      ]
    case 'privacy':
      return [
        { h: 'Information we collect', p: ['We collect the information you provide when placing an order (your name, phone number, email if given, and shipping address) solely to process and deliver your order.'] },
        { h: 'How we use your information', p: ['Your information is used to fulfil orders, contact you about your purchase, provide customer support, and (with your consent) send occasional updates about new products and offers.'] },
        { h: 'Data storage & sharing', p: ['We do not sell your personal information. We share delivery details only with our shipping partners to complete your order. Your data is kept secure and only as long as necessary.'] },
        { h: 'Cookies & analytics', p: ['We use basic analytics to understand how visitors use our website so we can improve it. This data is aggregated and does not personally identify you.'] },
        { h: 'Your rights', p: ['You may request access to, correction of, or deletion of your personal data at any time by contacting us.'] },
      ]
    case 'refund':
      return [
        { h: 'Our promise', p: [`We want you to love your ${store} gear. If something isn't right, we're here to help.`] },
        { h: 'Returns window', p: ['You may request a return or exchange within 14 days of receiving your order, provided the item is unused, in its original condition and packaging.'] },
        { h: 'Damaged or wrong items', p: ['If your item arrives damaged or you received the wrong product, contact us within 48 hours of delivery with photos and we will arrange a free replacement or full refund.'] },
        { h: 'How to request a return', p: ['Contact us through our Contact page or WhatsApp with your order number. Our team will guide you through the process.'] },
        { h: 'Refunds', p: ['Approved refunds are processed once we receive and inspect the returned item. Refunds are issued via the original payment arrangement. Shipping fees are non-refundable unless the return is due to our error.'] },
        { h: 'Non-returnable items', p: ['For hygiene and safety reasons, certain items may not be eligible for return unless faulty. This will be noted on the product page where applicable.'] },
      ]
    case 'shipping':
      return [
        { h: 'Where we deliver', p: ['We deliver to all governorates across Egypt 🇪🇬.'] },
        { h: 'Delivery time', p: ['Orders are typically processed within 1–2 business days. Delivery usually takes 2–5 business days depending on your location.'] },
        { h: 'Shipping fees', p: ['A flat shipping fee applies to most orders, shown at checkout. Enjoy free shipping on qualifying orders above the threshold displayed in your cart.'] },
        { h: 'Cash on delivery', p: ['We offer cash on delivery nationwide. Simply pay the courier in cash when your order arrives.'] },
        { h: 'Order tracking', p: ['Our team will contact you to confirm your order and keep you updated. For any delivery questions, reach out via WhatsApp.'] },
      ]
  }
}

export default function Policy({ kind }: { kind: Kind }) {
  const store = useStore((d) => d.settings.storeName)
  const sections = content(kind, store)
  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-head text-3xl font-extrabold text-navy-900 sm:text-4xl">{titles[kind]}</h1>
        <p className="mt-2 text-sm text-slatey">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-head text-xl font-bold text-navy-900">{i + 1}. {s.h}</h2>
              {s.p.map((para, j) => <p key={j} className="mt-3 leading-relaxed text-navy-600">{para}</p>)}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
