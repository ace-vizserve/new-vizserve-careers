"use client"

import React, { useState } from 'react'
import Footer from '../components/footer'
import Navbar from '../components/navbar'
import BottomSidebar from '../components/bottomSidebar'

// Define types for better type safety
interface Coach {
  id: number;
  name: string;
  role: string;
  years: string;
  image: string;
  skills: string[];
}

interface Talent {
  id: number;
  name: string;
  role: string;
  img: string;
}

const Page = () => {
  const [talents, setTalents] = useState<Talent[]>([])

  // Array of coaches data
  const coaches: Coach[] = [
    {
      id: 1,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    },
    {
      id: 2,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    },
    {
      id: 3,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    },
    {
      id: 4,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    },
    {
      id: 5,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    },
    {
      id: 6,
      name: "Lebron James",
      role: "Basketball Coach",
      years: "15 years",
      image: "/assets/Lebron.png",
      skills: ["Physical Coach", "Diet Coach", "Motivator Coach"]
    }
  ]

  const categories = ["All Budget", "IT Dev", "Mobile Develop", "UX/UI Dev", "E-Commerce", "Marketing"]
  const stats = [
    { value: "1,250", label: "Media Jobs" },
    { value: "1,250", label: "Business Jobs" },
    { value: "1,250", label: "Sales Jobs" }
  ]

  const handleHireNow = (coach: Coach) => {
    const isAlreadyHired = talents.some(t => t.id === coach.id)
    
    if (!isAlreadyHired) {
      setTalents([...talents, {
        id: coach.id,
        name: coach.name,
        role: coach.role,
        img: coach.image
      }])
    }
  }

  const handleRemove = (id: number) => {
    setTalents(talents.filter((talent) => talent.id !== id))
  }

  const isCoachHired = (coachId: number) => {
    return talents.some(t => t.id === coachId)
  }

  return (
    <div>
      <div className="mb-20 sm:mb-24 md:mb-32 lg:mb-35">
        <Navbar />
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#4359A5] via-[#55C9E7] to-[#4359A5] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-black"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button className="bg-white text-[#4359A5] px-6 py-2 rounded-full font-semibold mb-8 hover:bg-gray-100 transition">
            BACK
          </button>

          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Hire your best player!
            </h1>
            <p className="text-lg opacity-90">
              Search any skill to discover our<br />
              expert-approved recommendations
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex flex-wrap gap-3 mb-8">
            <input 
              type="text" 
              placeholder="Job Title"
              className="px-6 py-3 rounded-full text-gray-800 flex-1 min-w-[200px]"
            />
            <input 
              type="text" 
              placeholder="Location"
              className="px-6 py-3 rounded-full text-gray-800 flex-1 min-w-[200px]"
            />
            <button className="bg-yellow-400 text-[#4359A5] px-8 py-3 rounded-full font-semibold hover:bg-yellow-300 transition">
              Find Job
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
            {categories.map((category, index) => (
              <button 
                key={index}
                className="bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full hover:bg-white/30 transition"
              >
                {category}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coaches Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {coaches.map((coach) => (
            <div 
              key={coach.id}
              className="bg-[#4359A5] rounded-2xl p-6 text-white shadow-lg"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-yellow-400">
                  <img 
                    src={coach.image} 
                    alt={coach.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-center">{coach.name}</h3>
                <p className="text-sm opacity-90">{coach.role}</p>
                <p className="text-sm font-semibold mt-1">{coach.years}</p>
              </div>

              <ul className="space-y-2 mb-6">
                {coach.skills.map((skill, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">•</span>
                    {skill}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <button className="flex-1 bg-[#55C9E7] hover:bg-[#55C9E7]/80 py-2 rounded-lg transition">
                  Request Resume
                </button>
                <button 
                  onClick={() => handleHireNow(coach)}
                  disabled={isCoachHired(coach.id)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    isCoachHired(coach.id) 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-yellow-400 hover:bg-yellow-300 text-[#4359A5]'
                  }`}
                >
                  {isCoachHired(coach.id) ? 'Hired' : 'Hire Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2">
          <button className="px-3 py-1 text-[#4359A5] hover:bg-[#55C9E7]/20 rounded">
            Previous
          </button>
          <button className="px-3 py-1 bg-[#55C9E7]/30 text-[#4359A5] rounded">1</button>
          <button className="px-3 py-1 bg-[#4359A5] text-white rounded">2</button>
          <button className="px-3 py-1 hover:bg-[#55C9E7]/20 text-[#4359A5] rounded">3</button>
          <button className="px-3 py-1 text-[#4359A5] hover:bg-[#55C9E7]/20 rounded">
            Next
          </button>
        </div>
      </div>

      {/* Clean component call */}
      <BottomSidebar talents={talents} onRemove={handleRemove} />

      <Footer/>
    </div>
  )
}

export default Page