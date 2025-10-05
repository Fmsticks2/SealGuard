import { motion } from "framer-motion";
import { 
  Shield, 
  Zap, 
  BarChart3, 
  Lock, 
  Heart, 
  Headphones,
  CheckCircle,
  Star,
  ArrowRight,
  Upload,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { useState } from "react";
import ContactForm from "../components/ContactForm";
import PerformanceOptimizer from "../components/PerformanceOptimizer";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Chief Compliance Officer",
      company: "TechCorp Financial",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      content: "SealGuard has revolutionized our document verification process. The blockchain integration provides the immutable audit trail we need for regulatory compliance."
    },
    {
      name: "Michael Rodriguez",
      role: "IT Director",
      company: "Global Healthcare Systems",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      content: "The security and transparency that SealGuard offers is unmatched. Our stakeholders have complete confidence in our document integrity."
    },
    {
      name: "Emily Watson",
      role: "Legal Operations Manager",
      company: "Premier Law Group",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      content: "SealGuard's user-friendly interface combined with enterprise-grade security makes it perfect for our legal document management needs."
    }
  ];

  const faqs = [
    {
      question: "How does blockchain verification work?",
      answer: "SealGuard creates a unique cryptographic hash of your document and stores it on the Filecoin blockchain. This creates an immutable record that can be used to verify the document's authenticity and detect any tampering."
    },
    {
      question: "Is my document data secure?",
      answer: "Absolutely. We only store the document's cryptographic fingerprint on the blockchain, not the actual document content. Your sensitive data remains private and secure in your systems."
    },
    {
      question: "What file types are supported?",
      answer: "SealGuard supports all major file types including PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, and many more. Our system works with any digital file."
    },
    {
      question: "How long does verification take?",
      answer: "Document verification is typically completed within 30 seconds to 2 minutes, depending on file size and network conditions."
    },
    {
      question: "Can I integrate SealGuard with my existing systems?",
      answer: "Yes! SealGuard offers comprehensive APIs and webhooks that allow seamless integration with your existing document management systems, CRM, or enterprise software."
    }
  ];

  return (
    <div className="min-h-screen">
      <PerformanceOptimizer />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-6">
                <Shield className="w-4 h-4 mr-2" />
                Blockchain-Powered Security
              </span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight"
            >
              Secure Document
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Verification
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Protect your critical documents with immutable blockchain verification. 
              Ensure authenticity, prevent tampering, and maintain complete audit trails 
              with enterprise-grade security.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center">
                Start Verifying Documents
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-400 transition-colors">
                Watch Demo
              </button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <div className="text-4xl font-bold text-blue-600 mb-2">1M+</div>
              <div className="text-gray-600">Documents Verified</div>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <div className="text-4xl font-bold text-purple-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime Guarantee</div>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-gray-600">Enterprise Clients</div>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">Support Available</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose SealGuard?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive blockchain solution provides unmatched security, 
              transparency, and reliability for your document verification needs.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Immutable Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Leverage blockchain technology to create tamper-proof records. Once verified, 
                your documents are protected by cryptographic security that cannot be altered or forged.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Get instant verification results with our optimized blockchain infrastructure. 
                Process thousands of documents per minute without compromising security.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Complete Audit Trail</h3>
              <p className="text-gray-600 leading-relaxed">
                Maintain comprehensive logs of all document interactions. Perfect for compliance, 
                legal requirements, and internal auditing processes.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">
                Your document content stays private. We only store cryptographic fingerprints 
                on the blockchain, ensuring your sensitive data remains secure.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Easy Integration</h3>
              <p className="text-gray-600 leading-relaxed">
                Seamlessly integrate with your existing systems using our comprehensive APIs, 
                SDKs, and pre-built connectors for popular platforms.
              </p>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Headphones className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">24/7 Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Get expert help whenever you need it. Our dedicated support team is available 
                around the clock to ensure your success.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How SealGuard Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, secure, and reliable document verification in three easy steps.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Upload Document</h3>
              <p className="text-gray-600 leading-relaxed">
                Simply drag and drop your document or use our API to upload. 
                We support all major file formats and sizes up to 100MB.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Blockchain Verification</h3>
              <p className="text-gray-600 leading-relaxed">
                Our system creates a unique cryptographic hash and records it on the 
                Filecoin blockchain, creating an immutable verification record.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Get Certificate</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive a tamper-proof verification certificate with blockchain proof. 
                Share it with stakeholders or use it for compliance purposes.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our customers say about their experience with SealGuard.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-white p-8 rounded-2xl shadow-lg"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your needs. All plans include our core security features.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Starter Plan */}
            <motion.div variants={fadeInUp} className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$29<span className="text-lg text-gray-600">/month</span></div>
                <p className="text-gray-600">Perfect for small teams</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 1,000 documents/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic API access</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Email support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Standard verification certificates</span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                Get Started
              </button>
            </motion.div>

            {/* Professional Plan */}
            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-8 relative">
              <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                Popular
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <div className="text-4xl font-bold mb-2">$99<span className="text-lg opacity-80">/month</span></div>
                <p className="opacity-80">For growing businesses</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
                  <span>Up to 10,000 documents/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
                  <span>Full API access</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                Get Started
              </button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div variants={fadeInUp} className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">Custom</div>
                <p className="text-gray-600">For large organizations</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited documents</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>White-label solution</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>24/7 dedicated support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>On-premise deployment</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>SLA guarantees</span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                Contact Sales
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Get answers to common questions about SealGuard.
            </p>
          </motion.div>

          <motion.div 
            className="space-y-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {faqs.map((faq, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-xl border border-gray-200"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to secure your documents with blockchain technology? 
              Contact us today to get started.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
                    <p className="text-gray-600">hello@sealguard.app</p>
                    <p className="text-gray-600">support@sealguard.app</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-gray-600">Mon-Fri 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Visit Us</h3>
                    <p className="text-gray-600">123 Blockchain Street</p>
                    <p className="text-gray-600">San Francisco, CA 94105</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <ContactForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Secure Your Documents?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of organizations that trust SealGuard to protect their critical documents 
              with blockchain technology.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors">
                Schedule Demo
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}