"use client";
import React from "react";
import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, ChevronRight } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#4359A5] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <Image
              src="/assets/logo.png"
              alt="Logo"
              width={160}
              height={80}
              className="h-16 w-auto object-contain brightness-0 invert"
            />
            <p className="text-white/80 text-sm leading-relaxed">
              Connecting talented professionals with outstanding opportunities. Your team-building journey starts here.
            </p>
            {/* Social Media */}
            <div className="flex items-center space-x-2 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-cyan-400 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-cyan-400 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-cyan-400 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-cyan-400 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {["Vizserve Official Website", "Careers", "Contact Us"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-white/80 hover:text-cyan-400 transition-colors duration-300 flex items-center group text-sm"
                  >
                    <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -ml-5 group-hover:ml-0" />
                    <span>{link}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Job Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Job Categories</h3>
            <ul className="space-y-2.5">
              {["VizBooks", "VizAssists", "VizMedia", "VizBytes"].map((category) => (
                <li key={category}>
                  <a
                    href="#"
                    className="text-white/80 hover:text-cyan-400 transition-colors duration-300 flex items-center group text-sm"
                  >
                    <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -ml-5 group-hover:ml-0" />
                    <span>{category}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@example.com"
                  className="flex items-start space-x-3 text-white/80 hover:text-cyan-400 transition-colors duration-300 group text-sm"
                >
                  <Mail className="w-5 h-5 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span>ourvizserve@example.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+1234567890"
                  className="flex items-start space-x-3 text-white/80 hover:text-cyan-400 transition-colors duration-300 group text-sm"
                >
                  <Phone className="w-5 h-5 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span>0912-124-1234</span>
                </a>
              </li>
              <li>
                <div className="flex items-start space-x-3 text-white/80 text-sm">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Level 39 Marina Bay Financial Tower 2 ,10 Marina Bay Boulevard 018983</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <p className="text-white/70 text-sm">
              © {currentYear} Vizserve. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <a
                href="#"
                className="text-white/70 hover:text-cyan-400 transition-colors duration-300"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-white/70 hover:text-cyan-400 transition-colors duration-300"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-white/70 hover:text-cyan-400 transition-colors duration-300"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;