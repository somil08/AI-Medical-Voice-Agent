"use client";
import React from "react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import AddNewSession from "./AddNewSession";
function HistoryList() {    
    const [history, setHistory] = useState([]);
  return (
    <div className="mt-10">
{history.length == 0 ? 
<div className="flex items-center flex-col justify-center p-7 border border-dashed rounded-2xl border-2">
<Image src="/medical-assistance.png" alt="assistance" width={150} height={150} />
<h2 className="font-bold text-xl mt-2">No recnet history consultations.</h2>
<p>It looks like you haven't consulted with doctors yet.</p>
<AddNewSession />
</div>:
<div>
    List
</div>
}

    </div>
  );
}
export default HistoryList;